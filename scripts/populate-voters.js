/**
 * Populate total_registered_voters and total_votes_cast for all 165 HoR constituencies.
 *
 * 1. Fetches polling-center voter counts from a public CSV (debindra/election-2082-visualization)
 *    and aggregates them per constituency to get total_registered_voters.
 * 2. Fetches FPTP candidate data from the EC JSON API per constituency to get total_votes_cast
 *    and status.
 * 3. Maps EC district IDs → Supabase district IDs via Nepali name matching
 *    (the two systems use different ID schemes).
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/populate-voters.js
 */

const { createClient } = require("@supabase/supabase-js");
const { fetchECData, getSession, EC_JSON, EC_PAGE } = require("./lib/ec-fetcher");
const fetch = require("node-fetch");

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://lorrugedmqbjrxodxgdh.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const VOTING_CENTERS_CSV_URL =
  "https://raw.githubusercontent.com/debindra/election-2082-visualization/main/data/elections/voting_centers.csv";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0";

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Name normalization for fuzzy matching
// ---------------------------------------------------------------------------

/** Strip diacritics, nasals, and normalize for fuzzy Nepali name matching. */
function normalizeNe(name) {
  return (name || "")
    .replace(/\s*\(.*\)\s*/g, "") // strip parenthetical
    .replace(/[ँंःऽ।॥\u200d\u200c]/g, "") // remove anusvara, visarga, etc.
    .replace(/ङ्/g, "") // strip half-ङ
    .replace(/ञ्/g, "न") // ञ→न
    .replace(/ङ/g, "") // strip ङ
    .replace(/्/g, "") // strip halant to decompose conjuncts
    .replace(/ू/g, "ु") // normalize long vowel to short
    .replace(/\s+/g, "")
    .trim();
}

function normalizeEn(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\s*(east|west|north|south)\s*/gi, "")
    .replace(/[^a-z]/g, "");
}

// Mapping from CSV district_name_english → DB district code
// Handles spelling variations and split districts
const CSV_TO_DB_DISTRICT = {
  udaipur: "udayapur",
  sindhupalchowk: "sindhupalchok",
};

// Explicit EC distId → DB district code for Nepali name mismatches
const EC_DIST_OVERRIDES = {
  1: "taplejung",         // ताप्लेजुंग vs ताप्लेजुङ
  5: "sankhuwasabha",     // संखुवासभा vs सङ्खुवासभा
  6: "terhathum",         // तेर्हथुम vs तेह्रथुम
  13: "okhaldhunga",      // ओखलढुंगा vs ओखलढुङ्गा
  38: "lamjung",          // लमजुंग vs लमजुङ
  45: "nawalparasi_east", // नवलपरासी (बर्दघाट सुस्ता पूर्व)
  46: "rupandehi",        // रुपन्देही vs रूपन्देही
  48: "mustang",          // मुस्तांग vs मुस्ताङ
  52: "rukum_east",       // रुकुम पूर्व
  75: "kanchanpur",       // कन्चनपुर vs कञ्चनपुर
  77: "nawalparasi_west", // नवलपरासी (बर्दघाट सुस्ता पश्चिम)
  78: "rukum_west",       // रुकुम पश्चिम
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

/** Fetch EC districts JSON with BOM stripping. */
async function fetchECDistricts() {
  const session = await getSession();
  const url = `${EC_JSON}?file=JSONFiles/Election2082/Local/Lookup/districts.json`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: session.cookies,
      "X-CSRF-Token": session.csrf,
      "X-Requested-With": "XMLHttpRequest",
      Referer: EC_PAGE,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`EC districts fetch failed: HTTP ${res.status}`);
  const text = await res.text();
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

/** Download and aggregate voting centers CSV → { "dbDistCode|constNo": voterCount } */
async function fetchRegisteredVoters(dbDistricts) {
  console.log("📥 Downloading voting centers CSV...");
  const res = await fetch(VOTING_CENTERS_CSV_URL, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`CSV download failed: HTTP ${res.status}`);

  const text = await res.text();
  const rows = parseCSV(text);
  console.log(`   Parsed ${rows.length} polling center rows`);

  // Build CSV district name → DB district code mapping
  const dbByNameLower = {};
  for (const d of dbDistricts) {
    dbByNameLower[d.name_en.toLowerCase()] = d.code;
  }

  const voterMap = {}; // "dbDistCode|constNo" → totalVoters
  for (const row of rows) {
    const csvDist = (row.district_name_english || "").trim();
    const areaNo = parseInt(row.area_no) || 0;
    const voters = parseInt(row.voter_count) || 0;
    if (!csvDist || areaNo === 0) continue;

    // Resolve CSV district name to DB district code
    const csvLower = csvDist.toLowerCase();
    let dbCode = CSV_TO_DB_DISTRICT[csvLower] || dbByNameLower[csvLower];

    // For split districts (Nawalparasi, Rukum), use province to determine East vs West
    if (!dbCode && csvLower === "nawalparasi") {
      const province = (row.province || "").trim();
      if (province.includes("गण्डकी") || province.includes("gandaki")) {
        dbCode = "nawalparasi_east";
      } else {
        dbCode = "nawalparasi_west";
      }
    }
    if (!dbCode && csvLower === "rukum") {
      const province = (row.province || "").trim();
      if (province.includes("लुम्बिनी") || province.includes("lumbini")) {
        dbCode = "rukum_east";
      } else {
        dbCode = "rukum_west";
      }
    }
    if (!dbCode) continue;

    const key = `${dbCode}|${areaNo}`;
    voterMap[key] = (voterMap[key] || 0) + voters;
  }

  console.log(
    `   Aggregated voter counts for ${Object.keys(voterMap).length} constituency keys`
  );
  return voterMap;
}

// ---------------------------------------------------------------------------
// Build EC distId → DB district.id mapping via Nepali name
// ---------------------------------------------------------------------------

function buildDistrictMapping(ecDistricts, dbDistricts) {
  const mapping = {}; // ecDistId → dbDist object
  const unmapped = [];

  // Index DB districts by normalized Nepali name AND by code
  const dbByNe = {};
  const dbByCode = {};
  for (const d of dbDistricts) {
    dbByNe[normalizeNe(d.name_ne)] = d;
    dbByCode[d.code] = d;
  }

  for (const ec of ecDistricts) {
    if (ec.id >= 98) continue; // skip NA entries

    // 1. Try explicit override
    if (EC_DIST_OVERRIDES[ec.id]) {
      const dbDist = dbByCode[EC_DIST_OVERRIDES[ec.id]];
      if (dbDist) {
        mapping[ec.id] = dbDist;
        continue;
      }
    }

    // 2. Try normalized Nepali name match
    const ecNorm = normalizeNe(ec.name);
    if (dbByNe[ecNorm]) {
      mapping[ec.id] = dbByNe[ecNorm];
      continue;
    }

    // 3. Fuzzy: find best substring match
    let best = null;
    let bestLen = 0;
    for (const [norm, dbDist] of Object.entries(dbByNe)) {
      if (norm.includes(ecNorm) || ecNorm.includes(norm)) {
        const len = Math.min(norm.length, ecNorm.length);
        if (len > bestLen) {
          bestLen = len;
          best = dbDist;
        }
      }
    }

    if (best) {
      mapping[ec.id] = best;
    } else {
      unmapped.push({ ecId: ec.id, ecName: ec.name, ecNorm });
    }
  }

  return { mapping, unmapped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("📊 Populating constituency voter data...\n");

  // 1. Fetch all Supabase districts & constituencies first (needed for CSV mapping)
  const { data: dbDistricts } = await supabase
    .from("districts")
    .select("id, code, name_en, name_ne")
    .order("id");

  const { data: dbConstituencies } = await supabase
    .from("constituencies")
    .select("id, district_id, number")
    .order("id");

  // 2. Fetch registered voter data from CSV
  const voterMap = await fetchRegisteredVoters(dbDistricts);

  // 3. Fetch EC lookups
  const [horLookup, ecDistricts] = await Promise.all([
    fetchECData("JSONFiles/Election2082/HOR/Lookup/constituencies.json"),
    fetchECDistricts(),
  ]);
  console.log(`\n🏛️  EC: ${horLookup.length} district entries, ${ecDistricts.length} districts`);

  // 4. Build mapping: EC distId → Supabase district
  const { mapping: distMapping, unmapped } = buildDistrictMapping(
    ecDistricts,
    dbDistricts
  );
  console.log(`   Mapped ${Object.keys(distMapping).length} EC districts → DB districts`);
  if (unmapped.length > 0) {
    console.log(`   ⚠️  Unmapped EC districts:`, unmapped);
  }

  // Build constituency lookup: "dbDistId-constNo" → dbConst
  const dbConstMap = {};
  for (const c of dbConstituencies) {
    dbConstMap[`${c.district_id}-${c.number}`] = c;
  }

  let updatedVoters = 0;
  let updatedVotes = 0;
  let totalConsts = 0;
  let skipped = 0;

  // 5. Iterate each district/constituency from EC lookup
  for (const entry of horLookup) {
    const ecDistId = entry.distId;
    const numConsts = entry.consts;
    const dbDist = distMapping[ecDistId];

    if (!dbDist) {
      for (let c = 1; c <= numConsts; c++) {
        totalConsts++;
        skipped++;
      }
      console.log(`  ⚠️  Skipping EC dist ${ecDistId}: no DB mapping`);
      continue;
    }

    for (let constNo = 1; constNo <= numConsts; constNo++) {
      totalConsts++;

      const dbConst = dbConstMap[`${dbDist.id}-${constNo}`];
      if (!dbConst) {
        skipped++;
        continue;
      }

      const updateData = {
        updated_at: new Date().toISOString(),
      };

      // --- Registered voters from CSV ---
      const csvKey = `${dbDist.code}|${constNo}`;
      const registeredVoters = voterMap[csvKey] || 0;
      if (registeredVoters > 0) {
        updateData.total_registered_voters = registeredVoters;
        updatedVoters++;
      }

      // --- FPTP candidate data from EC ---
      try {
        const candidates = await fetchECData(
          `JSONFiles/Election2082/HOR/FPTP/HOR-${ecDistId}-${constNo}.json`,
          { retries: 2, timeout: 8000 }
        );

        if (Array.isArray(candidates) && candidates.length > 0) {
          const totalVotes = candidates.reduce(
            (s, c) => s + (c.TotalVoteReceived || 0),
            0
          );
          const hasWinner = candidates.some((c) => c.Remarks === "Elected");
          updateData.total_votes_cast = totalVotes;
          updateData.status = hasWinner
            ? "declared"
            : totalVotes > 0
              ? "counting"
              : "pending";
          updatedVotes++;
        }
      } catch (err) {
        // Non-fatal: still update registered voters if we have them
      }

      // --- Update Supabase ---
      const { error } = await supabase
        .from("constituencies")
        .update(updateData)
        .eq("id", dbConst.id);

      const rv = updateData.total_registered_voters || "-";
      const tv = updateData.total_votes_cast || "-";
      const st = updateData.status || "-";
      if (error) {
        console.log(`  ❌ ${dbDist.name_en}-${constNo}: ${error.message}`);
      } else {
        console.log(`  ✅ ${dbDist.name_en}-${constNo}: registered=${rv} votes=${tv} status=${st}`);
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(
    `\n🎉 Done! ${updatedVoters}/${totalConsts} got registered voters, ` +
      `${updatedVotes}/${totalConsts} got vote counts (${skipped} skipped)`
  );

  // --- Verification ---
  console.log("\n📋 Verification:");
  const { data: allConsts } = await supabase
    .from("constituencies")
    .select("total_registered_voters, total_votes_cast");

  const withVoters = (allConsts || []).filter(
    (c) => c.total_registered_voters > 0
  ).length;
  const withVotes = (allConsts || []).filter(
    (c) => c.total_votes_cast > 0
  ).length;
  const sumRegistered = (allConsts || []).reduce(
    (s, c) => s + (c.total_registered_voters || 0),
    0
  );
  const sumVotes = (allConsts || []).reduce(
    (s, c) => s + (c.total_votes_cast || 0),
    0
  );

  console.log(`   Constituencies with registered voters: ${withVoters}/165`);
  console.log(`   Constituencies with votes cast: ${withVotes}/165`);
  console.log(`   Total registered voters: ${sumRegistered.toLocaleString()}`);
  console.log(`   Total votes cast: ${sumVotes.toLocaleString()}`);
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
