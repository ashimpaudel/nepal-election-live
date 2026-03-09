/**
 * EC JSON API scraper for Nepal Election Live.
 * Fetches structured election data directly from EC JSON endpoints
 * instead of parsing HTML. Uses the shared ec-fetcher module for
 * session/CSRF management and retry logic.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/scrape-ec-json.js
 *
 * Without Supabase env vars, writes to frontend/public/data.json only.
 */

const fs = require("fs");
const path = require("path");
const {
  fetchECData,
  probeEndpoint,
  loadEndpointConfig,
} = require("./lib/ec-fetcher");

// ---------------------------------------------------------------------------
// Supabase (optional)
// ---------------------------------------------------------------------------
let supabase = null;
try {
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    supabase = createClient(url, key);
    console.log("✅ Supabase client initialized");
  }
} catch {
  // Supabase not available — JSON-only mode
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DATA_PATH = path.join(__dirname, "../frontend/public/data.json");
const TOTAL_SEATS = 275;
const FPTP_SEATS = 165;
const PR_SEATS = 110;
const PR_THRESHOLD = 0.03; // 3% of total PR votes

// Nepali → English canonical party name mapping
const PARTY_NAME_MAP = {
  "राष्ट्रिय स्वतन्त्र पार्टी": "RSP",
  "नेपाली काँग्रेस": "Nepali Congress",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)": "CPN-UML",
  "नेपाली कम्युनिष्ट पार्टी": "CPN-Maoist Centre",
  "राष्ट्रिय प्रजातन्त्र पार्टी": "RPP",
  "जनता समाजवादी पार्टी": "Janata Samajbadi",
  "जनमत पार्टी": "Janamat Party",
  "लोकतान्त्रिक समाजवादी": "Loktantrik Samajbadi",
  "नागरिक उन्मुक्ति पार्टी": "Nagarik Unmukti",
  "श्रम संस्कृति पार्टी": "Shram Sanskriti Party",
  "स्वतन्त्र": "Independent",
};

// Party metadata for data.json and auto-creation
const PARTY_META = {
  "Nepali Congress": {
    nameNp: "नेपाली कांग्रेस",
    shortName: "NC",
    color: "#E11D48",
  },
  "CPN-UML": {
    nameNp: "नेकपा एमाले",
    shortName: "UML",
    color: "#2563EB",
  },
  "CPN-Maoist Centre": {
    nameNp: "नेकपा माओवादी केन्द्र",
    shortName: "MC",
    color: "#DC2626",
  },
  RSP: {
    nameNp: "राष्ट्रिय स्वतन्त्र पार्टी",
    shortName: "RSP",
    color: "#F59E0B",
  },
  RPP: { nameNp: "राप्रपा", shortName: "RPP", color: "#8B5CF6" },
  "Janata Samajbadi": {
    nameNp: "जनता समाजवादी पार्टी",
    shortName: "JSP",
    color: "#10B981",
  },
  "Janamat Party": {
    nameNp: "जनमत पार्टी",
    shortName: "JP",
    color: "#F97316",
  },
  "Loktantrik Samajbadi": {
    nameNp: "लोकतान्त्रिक समाजवादी",
    shortName: "LSP",
    color: "#6366F1",
  },
  "Nagarik Unmukti": {
    nameNp: "नागरिक उन्मुक्ति पार्टी",
    shortName: "NUP",
    color: "#14B8A6",
  },
  "Shram Sanskriti Party": {
    nameNp: "श्रम संस्कृति पार्टी",
    shortName: "SSP",
    color: "#059669",
  },
  Independent: { nameNp: "स्वतन्त्र", shortName: "Ind", color: "#6B7280" },
};

// Auto-generated fallback colors for unknown parties
const FALLBACK_COLORS = [
  "#EF4444", "#3B82F6", "#22C55E", "#A855F7", "#EC4899",
  "#F97316", "#06B6D4", "#84CC16", "#E11D48", "#8B5CF6",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve Nepali party name to English canonical name. */
function resolvePartyName(nepaliName) {
  const trimmed = (nepaliName || "").trim();
  if (PARTY_NAME_MAP[trimmed]) return PARTY_NAME_MAP[trimmed];

  // Fuzzy fallback for slight variations
  for (const [np, en] of Object.entries(PARTY_NAME_MAP)) {
    if (trimmed.includes(np) || np.includes(trimmed)) return en;
  }
  return trimmed; // Return as-is if no mapping found
}

/** Delay helper for rate limiting. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Get party metadata, with auto-generated fallback for unknowns. */
function getPartyMeta(nameEn) {
  if (PARTY_META[nameEn]) return PARTY_META[nameEn];
  const idx = Object.keys(PARTY_META).length;
  return {
    nameNp: nameEn,
    shortName: nameEn.slice(0, 4).toUpperCase(),
    color: FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
  };
}

/**
 * Look up or auto-create a party in Supabase by name_en.
 * Returns the party's DB id, or null if no Supabase.
 */
async function ensurePartyInDB(nameEn) {
  if (!supabase) return null;

  // Look up existing party
  const { data: existing } = await supabase
    .from("parties")
    .select("id")
    .eq("name_en", nameEn)
    .maybeSingle();

  if (existing) return existing.id;

  // Auto-create unknown party
  const meta = getPartyMeta(nameEn);
  const { data: created, error } = await supabase
    .from("parties")
    .insert({
      name_en: nameEn,
      name_ne: meta.nameNp,
      short_name: meta.shortName,
      color: meta.color,
    })
    .select("id")
    .single();

  if (error) {
    console.warn(`⚠️  Could not create party "${nameEn}": ${error.message}`);
    return null;
  }
  console.log(`  ➕ Auto-created party: ${nameEn}`);
  return created.id;
}

// ---------------------------------------------------------------------------
// Scrape result accumulator
// ---------------------------------------------------------------------------
const results = {
  parties: {},       // nameEn → { won, leading, prVotes, ecSymbolId }
  pa: {},            // provinceId → { nameEn → { won, leading, prVotes } }
  constituencies: [],
  candidates: [],
  constituencyData: [], // per-constituency FPTP candidate + PR vote data
  probeResults: {},  // endpointKey → { available, description }
  errors: [],
  recordsUpdated: 0,
  sources: [],
};

function partyEntry(nameEn) {
  if (!results.parties[nameEn]) {
    results.parties[nameEn] = {
      won: 0,
      leading: 0,
      prVotes: 0,
      ecSymbolId: null,
    };
  }
  return results.parties[nameEn];
}

// ---------------------------------------------------------------------------
// 1. HoR FPTP party results
// ---------------------------------------------------------------------------
async function fetchHoRFPTP() {
  console.log("\n🏛️  Fetching HoR FPTP party results…");

  // Try full list first, fall back to top 5
  let data = null;
  let source = "HoRPartyTop5.txt";

  const probe = await probeEndpoint("HoRPartyAll.txt");
  if (probe.available) {
    data = probe.data;
    source = "HoRPartyAll.txt";
    console.log("  📋 Using full party list (HoRPartyAll.txt)");
  } else {
    data = await fetchECData("HoRPartyTop5.txt");
    console.log("  📋 Using top-5 party list (HoRPartyTop5.txt)");
  }
  results.sources.push(source);

  if (!Array.isArray(data)) {
    throw new Error(`Unexpected FPTP response format: ${typeof data}`);
  }

  for (const row of data) {
    const nameEn = resolvePartyName(row.PoliticalPartyName);
    const entry = partyEntry(nameEn);
    entry.won = row.TotWin || 0;
    entry.leading = row.TotLead || 0;
    entry.ecSymbolId = row.SymbolID || entry.ecSymbolId;
  }

  console.log(`  ✅ Parsed ${data.length} parties from ${source}`);

  // Upsert to Supabase
  if (supabase) {
    for (const [nameEn, stats] of Object.entries(results.parties)) {
      const { error } = await supabase
        .from("parties")
        .update({
          fptp_won: stats.won,
          fptp_leading: stats.leading,
          ec_symbol_id: stats.ecSymbolId,
          updated_at: new Date().toISOString(),
        })
        .eq("name_en", nameEn);

      if (error) {
        // Party may not exist yet — try upsert
        await ensurePartyInDB(nameEn);
        await supabase
          .from("parties")
          .update({
            fptp_won: stats.won,
            fptp_leading: stats.leading,
            ec_symbol_id: stats.ecSymbolId,
            updated_at: new Date().toISOString(),
          })
          .eq("name_en", nameEn);
      }
      results.recordsUpdated++;
    }
    console.log("  📊 Supabase parties.fptp updated");
  }
}

// ---------------------------------------------------------------------------
// 2. HoR PR party results
// ---------------------------------------------------------------------------
async function fetchHoRPR() {
  console.log("\n🗳️  Fetching HoR PR party results…");

  let data = null;
  let source = "PRHoRPartyTop5.txt";

  const probe = await probeEndpoint("PRHoRPartyAll.txt");
  if (probe.available) {
    data = probe.data;
    source = "PRHoRPartyAll.txt";
    console.log("  📋 Using full PR list (PRHoRPartyAll.txt)");
  } else {
    data = await fetchECData("PRHoRPartyTop5.txt");
    console.log("  📋 Using top-5 PR list (PRHoRPartyTop5.txt)");
  }
  results.sources.push(source);

  if (!Array.isArray(data)) {
    throw new Error(`Unexpected PR response format: ${typeof data}`);
  }

  for (const row of data) {
    const nameEn = resolvePartyName(row.PoliticalPartyName);
    const entry = partyEntry(nameEn);
    entry.prVotes = row.TotalVoteReceived || 0;
    entry.ecSymbolId = row.SymbolID || entry.ecSymbolId;
  }

  console.log(`  ✅ Parsed ${data.length} parties from ${source}`);

  // Update Supabase
  if (supabase) {
    for (const [nameEn, stats] of Object.entries(results.parties)) {
      await supabase
        .from("parties")
        .update({
          pr_votes: stats.prVotes,
          updated_at: new Date().toISOString(),
        })
        .eq("name_en", nameEn);
    }
    console.log("  📊 Supabase parties.pr_votes updated");
  }
}

// ---------------------------------------------------------------------------
// 3. Probe additional endpoints
// ---------------------------------------------------------------------------
async function probeAdditionalEndpoints() {
  console.log("\n🔍 Probing additional EC endpoints…");

  const config = loadEndpointConfig();
  const probeEndpoints = Object.entries(config.endpoints).filter(
    ([, ep]) => ep.probe
  );

  for (const [key, ep] of probeEndpoints) {
    const result = await probeEndpoint(ep.file);
    results.probeResults[key] = {
      available: result.available,
      description: ep.description,
      file: ep.file,
    };

    const icon = result.available ? "✅" : "⬜";
    const status = result.available
      ? `available (${Array.isArray(result.data) ? result.data.length : "?"} records)`
      : `unavailable`;
    console.log(`  ${icon} ${ep.file}: ${status}`);

    // Process available probe data
    if (result.available && result.data) {
      try {
        await processProbeData(key, ep, result.data);
      } catch (err) {
        console.warn(`  ⚠️  Error processing ${ep.file}: ${err.message}`);
        results.errors.push(`probe:${key}: ${err.message}`);
      }
    }
  }
}

async function processProbeData(key, ep, data) {
  if (!Array.isArray(data)) return;

  switch (key) {
    case "hor_fptp_all":
      // Already handled in fetchHoRFPTP if probe succeeded; skip duplicate
      break;

    case "hor_pr_all":
      // Already handled in fetchHoRPR if probe succeeded; skip duplicate
      break;

    case "hor_const_result":
      console.log(`  📍 Processing ${data.length} constituency results`);
      results.constituencies = data;
      results.sources.push(ep.file);
      break;

    case "hor_cand_result":
      console.log(`  👤 Processing ${data.length} candidate results`);
      results.candidates = data;
      results.sources.push(ep.file);
      break;

    case "pr_const_result":
      console.log(`  🗳️  Processing ${data.length} PR constituency results`);
      results.sources.push(ep.file);
      break;

    case "voter_turnout":
      console.log(`  📊 Processing ${data.length} turnout records`);
      results.sources.push(ep.file);
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// 4. PA results for all 7 provinces
// ---------------------------------------------------------------------------
async function fetchPAResults() {
  console.log("\n🏔️  Fetching Provincial Assembly results…");

  for (let provinceId = 1; provinceId <= 7; provinceId++) {
    const file = `PAPartyTop5-S${provinceId}.txt`;
    try {
      const data = await fetchECData(file);
      results.sources.push(file);

      if (!Array.isArray(data)) {
        console.warn(`  ⚠️  Province ${provinceId}: unexpected format`);
        continue;
      }

      results.pa[provinceId] = {};

      for (const row of data) {
        const nameEn = resolvePartyName(row.PoliticalPartyName);
        results.pa[provinceId][nameEn] = {
          won: row.TotWin || 0,
          leading: row.TotLead || 0,
          prVotes: row.TotalVoteReceived || 0,
          ecSymbolId: row.SymbolID || null,
        };

        // Also ensure the party is tracked globally
        const entry = partyEntry(nameEn);
        entry.ecSymbolId = row.SymbolID || entry.ecSymbolId;
      }

      console.log(
        `  ✅ Province ${provinceId}: ${data.length} parties`
      );

      // Upsert to Supabase pa_party_results
      if (supabase) {
        for (const [nameEn, stats] of Object.entries(
          results.pa[provinceId]
        )) {
          const partyId = await ensurePartyInDB(nameEn);
          if (!partyId) continue;

          const { error } = await supabase
            .from("pa_party_results")
            .upsert(
              {
                province_id: provinceId,
                party_id: partyId,
                fptp_won: stats.won,
                fptp_leading: stats.leading,
                pr_votes: stats.prVotes,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "province_id,party_id" }
            );

          if (error) {
            console.warn(
              `  ⚠️  PA upsert failed (P${provinceId}/${nameEn}): ${error.message}`
            );
          } else {
            results.recordsUpdated++;
          }
        }
      }
    } catch (err) {
      console.warn(`  ⚠️  Province ${provinceId} (${file}): ${err.message}`);
      results.errors.push(`pa:${provinceId}: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. PR seat allocation — Sainte-Laguë method
// ---------------------------------------------------------------------------
function calculatePRSeats() {
  console.log("\n📐 Calculating PR seat allocation (Sainte-Laguë)…");

  const totalPRVotes = Object.values(results.parties).reduce(
    (sum, p) => sum + p.prVotes,
    0
  );

  if (totalPRVotes === 0) {
    console.log("  ⬜ No PR votes recorded — skipping allocation");
    return {};
  }

  const threshold = totalPRVotes * PR_THRESHOLD;
  console.log(
    `  📊 Total PR votes: ${totalPRVotes.toLocaleString()} | 3% threshold: ${Math.ceil(threshold).toLocaleString()}`
  );

  // Filter qualifying parties
  const qualifying = Object.entries(results.parties)
    .filter(([, p]) => p.prVotes >= threshold)
    .map(([name, p]) => ({ name, votes: p.prVotes }));

  console.log(`  ✅ ${qualifying.length} parties qualify for PR seats`);

  if (qualifying.length === 0) return {};

  // Sainte-Laguë allocation: divisors are 1, 3, 5, 7, 9, …
  const quotients = [];
  for (const party of qualifying) {
    for (let i = 0; i < PR_SEATS; i++) {
      const divisor = 2 * i + 1; // 1, 3, 5, 7, 9, …
      quotients.push({
        name: party.name,
        quotient: party.votes / divisor,
      });
    }
  }

  // Sort descending by quotient and take top PR_SEATS
  quotients.sort((a, b) => b.quotient - a.quotient);
  const allocated = quotients.slice(0, PR_SEATS);

  // Count seats per party
  const seatMap = {};
  for (const q of allocated) {
    seatMap[q.name] = (seatMap[q.name] || 0) + 1;
  }

  // Print allocation
  for (const [name, seats] of Object.entries(seatMap).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  🪑 ${name}: ${seats} PR seats`);
  }

  return seatMap;
}

async function applyPRSeats(seatMap) {
  // Update in-memory results
  for (const [name, seats] of Object.entries(seatMap)) {
    if (results.parties[name]) {
      results.parties[name].prSeats = seats;
    }
  }

  // Update Supabase
  if (supabase) {
    // Reset all PR seats to 0 first
    await supabase
      .from("parties")
      .update({ pr_seats: 0, updated_at: new Date().toISOString() })
      .gte("id", 0); // match all

    for (const [nameEn, seats] of Object.entries(seatMap)) {
      const { error } = await supabase
        .from("parties")
        .update({
          pr_seats: seats,
          updated_at: new Date().toISOString(),
        })
        .eq("name_en", nameEn);

      if (error) {
        console.warn(`  ⚠️  PR seat update failed for ${nameEn}: ${error.message}`);
      } else {
        results.recordsUpdated++;
      }
    }
    console.log("  📊 Supabase parties.pr_seats updated");
  }
}

// ---------------------------------------------------------------------------
// 5b. Constituency-level candidate data (FPTP + PR)
// ---------------------------------------------------------------------------
async function fetchConstituencyCandidates() {
  console.log("\n📍 Fetching constituency-level candidate data…");

  // 1. Fetch constituency lookup
  let constituencyLookup;
  try {
    constituencyLookup = await fetchECData(
      "JSONFiles/Election2082/HOR/Lookup/constituencies.json"
    );
  } catch (err) {
    console.error(`  ❌ Failed to fetch constituency lookup: ${err.message}`);
    results.errors.push(`constituency_lookup: ${err.message}`);
    return;
  }

  if (!Array.isArray(constituencyLookup) || constituencyLookup.length === 0) {
    console.warn("  ⚠️  Constituency lookup is empty or invalid — skipping");
    return;
  }

  results.sources.push("constituencies.json (lookup)");
  console.log(`  📋 Found ${constituencyLookup.length} districts in lookup`);

  // 2. Fetch district name lookup for mapping
  let districtLookup = [];
  try {
    districtLookup = await fetchECData(
      "JSONFiles/Election2082/Local/Lookup/districts.json"
    );
  } catch (err) {
    console.warn(
      `  ⚠️  District lookup failed: ${err.message} — names won't be available`
    );
  }

  // Build EC district ID → name/province maps
  const ecDistrictNames = {};
  const ecDistrictProvince = {};
  if (Array.isArray(districtLookup)) {
    for (const d of districtLookup) {
      ecDistrictNames[d.id] = d.name;
      ecDistrictProvince[d.id] = d.parentId || null;
    }
  }

  // 3. Pre-fetch Supabase districts & constituencies for mapping
  let dbDistricts = [];
  let dbConstituencies = [];

  if (supabase) {
    try {
      const { data: dists } = await supabase
        .from("districts")
        .select("id, name_ne");
      dbDistricts = dists || [];
    } catch (err) {
      console.warn(
        `  ⚠️  Could not fetch districts from Supabase: ${err.message}`
      );
    }
    try {
      const { data: consts } = await supabase
        .from("constituencies")
        .select("id, district_id, number, is_final");
      dbConstituencies = consts || [];
    } catch (err) {
      console.warn(
        `  ⚠️  Could not fetch constituencies from Supabase: ${err.message}`
      );
    }
  }

  // Build Supabase lookup maps
  const dbDistrictByName = {};
  for (const d of dbDistricts) {
    dbDistrictByName[d.name_ne.trim()] = d.id;
  }
  const dbConstMap = {};
  const dbConstFinal = {};
  for (const c of dbConstituencies) {
    dbConstMap[`${c.district_id}-${c.number}`] = c.id;
    if (c.is_final) dbConstFinal[`${c.district_id}-${c.number}`] = true;
  }

  // 4. Build list of all constituencies to fetch
  const allConstituencies = [];
  for (const entry of constituencyLookup) {
    for (let constNo = 1; constNo <= entry.consts; constNo++) {
      allConstituencies.push({ distId: entry.distId, constNo });
    }
  }

  const total = allConstituencies.length;
  let fetched = 0;
  let skipped = 0;
  let totalCandidates = 0;
  const constituencyResults = [];

  // 5. Fetch each constituency's FPTP candidates and PR votes
  for (let i = 0; i < allConstituencies.length; i++) {
    const { distId, constNo } = allConstituencies[i];
    const ecDistName = ecDistrictNames[distId] || `District-${distId}`;

    // Skip finalized constituencies — no need to re-fetch certified results
    if (supabase) {
      const supaDistId = dbDistrictByName[ecDistName.trim()];
      if (supaDistId) {
        const key = `${supaDistId}-${constNo}`;
        if (dbConstFinal[key]) {
          console.log(`  ⏭️  Skipping finalized: ${ecDistName}-${constNo}`);
          skipped++;
          continue;
        }
      }
    }

    console.log(
      `  Fetching constituency ${i + 1}/${total}: district ${distId} (${ecDistName}), const ${constNo}`
    );

    // --- FPTP Candidates ---
    let candidates = [];
    try {
      const fptpPath = `JSONFiles/Election2082/HOR/FPTP/HOR-${distId}-${constNo}.json`;
      const fptpData = await fetchECData(fptpPath, {
        retries: 2,
        timeout: 8000,
      });

      if (Array.isArray(fptpData) && fptpData.length > 0) {
        // Sort by votes descending
        fptpData.sort(
          (a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0)
        );

        const totalVotes = fptpData.reduce(
          (s, c) => s + (c.TotalVoteReceived || 0),
          0
        );
        const hasWinner = fptpData.some((c) => c.Remarks === "Elected");
        const status = hasWinner
          ? "declared"
          : totalVotes > 0
            ? "counting"
            : "pending";

        candidates = fptpData.map((c, rank) => {
          const nameEn = resolvePartyName(c.PoliticalPartyName);
          const meta = getPartyMeta(nameEn);
          return {
            candidateId: c.CandidateID,
            name: c.CandidateName,
            partyNameNe: c.PoliticalPartyName,
            party: nameEn,
            partyShort: meta.shortName,
            votes: c.TotalVoteReceived || 0,
            color: meta.color,
            isWinner: c.Remarks === "Elected",
            isLeading: rank === 0 && c.Remarks !== "Elected",
            age: c.Age,
            gender: c.Gender,
          };
        });

        const constName = `${ecDistName}-${constNo}`;
        constituencyResults.push({
          distId,
          constNo,
          name: constName,
          province: ecDistrictProvince[distId] || "",
          status,
          totalVotes,
          candidates,
        });

        totalCandidates += candidates.length;
        fetched++;

        // --- Supabase upsert for FPTP candidates ---
        if (supabase) {
          const supaDistId = dbDistrictByName[ecDistName.trim()];
          if (supaDistId) {
            const supaConstId = dbConstMap[`${supaDistId}-${constNo}`];
            if (supaConstId) {
              // Fetch existing candidates for this constituency
              const { data: existingCands } = await supabase
                .from("candidates")
                .select("id, name_ne")
                .eq("constituency_id", supaConstId);

              const existingByName = {};
              for (const ec of existingCands || []) {
                existingByName[ec.name_ne] = ec.id;
              }

              for (const cand of candidates) {
                const partyId =
                  cand.party === "Independent"
                    ? null
                    : await ensurePartyInDB(cand.party);

                const existingId = existingByName[cand.name];

                if (existingId) {
                  const { error } = await supabase
                    .from("candidates")
                    .update({
                      party_id: partyId,
                      votes: cand.votes,
                      is_winner: cand.isWinner,
                      is_leading: cand.isLeading,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingId);

                  if (error) {
                    console.warn(
                      `    ⚠️  Candidate update failed: ${error.message}`
                    );
                  } else {
                    results.recordsUpdated++;
                  }
                } else {
                  const { error } = await supabase
                    .from("candidates")
                    .insert({
                      constituency_id: supaConstId,
                      party_id: partyId,
                      name_en: cand.name,
                      name_ne: cand.name,
                      votes: cand.votes,
                      is_winner: cand.isWinner,
                      is_leading: cand.isLeading,
                    });

                  if (error) {
                    console.warn(
                      `    ⚠️  Candidate insert failed: ${error.message}`
                    );
                  } else {
                    results.recordsUpdated++;
                  }
                }
              }

              // Update constituency status and total votes
              const { error: constError } = await supabase
                .from("constituencies")
                .update({
                  status,
                  total_votes_cast: totalVotes,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", supaConstId);

              if (constError) {
                console.warn(
                  `    ⚠️  Constituency update failed: ${constError.message}`
                );
              } else {
                results.recordsUpdated++;
              }
            }
          }
        }
      } else {
        skipped++;
      }
    } catch (err) {
      console.warn(
        `    ⚠️  FPTP fetch failed for ${distId}-${constNo}: ${err.message}`
      );
      results.errors.push(`fptp_cand:${distId}-${constNo}: ${err.message}`);
      skipped++;
    }

    // --- PR Votes ---
    try {
      const prPath = `JSONFiles/Election2082/HOR/PR/HOR/HOR-${distId}-${constNo}.json`;
      const prData = await fetchECData(prPath, {
        retries: 2,
        timeout: 8000,
      });

      if (Array.isArray(prData) && prData.length > 0 && supabase) {
        const supaDistId =
          dbDistrictByName[(ecDistrictNames[distId] || "").trim()];
        if (supaDistId) {
          const supaConstId = dbConstMap[`${supaDistId}-${constNo}`];
          if (supaConstId) {
            for (const pr of prData) {
              const nameEn = resolvePartyName(pr.PoliticalPartyName);
              const partyId = await ensurePartyInDB(nameEn);
              if (!partyId) continue;

              const { error } = await supabase.from("pr_votes").upsert(
                {
                  constituency_id: supaConstId,
                  party_id: partyId,
                  votes: pr.TotalVoteReceived || 0,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "constituency_id,party_id" }
              );

              if (error) {
                console.warn(
                  `    ⚠️  PR vote upsert failed: ${error.message}`
                );
              } else {
                results.recordsUpdated++;
              }
            }
          }
        }
      }
    } catch (err) {
      // PR vote fetch failure is non-fatal
      console.warn(
        `    ⚠️  PR fetch failed for ${distId}-${constNo}: ${err.message}`
      );
    }

    // Rate limit: 200ms between requests
    await delay(200);
  }

  // Store results for data.json
  results.constituencyData = constituencyResults;
  results.sources.push("HOR/FPTP/HOR-*.json", "HOR/PR/HOR/HOR-*.json");

  console.log(
    `\n  📊 Fetched ${fetched}/${total} constituencies, ${totalCandidates} candidates total (${skipped} skipped)`
  );
}

// ---------------------------------------------------------------------------
// 6. Write data.json fallback
// ---------------------------------------------------------------------------
function writeDataJSON(prSeatMap) {
  console.log("\n📁 Writing data.json…");

  // Read existing data.json if available
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    // Start fresh
  }

  // Build parties array from accumulated results
  const knownNames = new Set([
    ...Object.keys(PARTY_META),
    ...Object.keys(results.parties),
  ]);

  const parties = [];
  for (const nameEn of knownNames) {
    const stats = results.parties[nameEn] || {
      won: 0,
      leading: 0,
      prVotes: 0,
    };
    const meta = getPartyMeta(nameEn);
    const prSeats = prSeatMap[nameEn] || 0;

    // Skip parties with no activity and no known metadata
    if (
      stats.won === 0 &&
      stats.leading === 0 &&
      stats.prVotes === 0 &&
      prSeats === 0 &&
      !PARTY_META[nameEn]
    ) {
      continue;
    }

    parties.push({
      name: nameEn,
      nameNp: meta.nameNp,
      shortName: meta.shortName,
      color: meta.color,
      won: stats.won,
      leading: stats.leading,
      totalVotes: stats.won + stats.leading, // FPTP seat total
      prVotes: stats.prVotes,
      prSeats,
      totalSeats: stats.won + prSeats,
    });
  }

  parties.sort((a, b) => b.won + b.leading - (a.won + a.leading));

  // Build PA summary
  const paResults = {};
  for (const [provId, partyMap] of Object.entries(results.pa)) {
    paResults[provId] = Object.entries(partyMap).map(([nameEn, stats]) => {
      const meta = getPartyMeta(nameEn);
      return {
        name: nameEn,
        nameNp: meta.nameNp,
        shortName: meta.shortName,
        color: meta.color,
        won: stats.won,
        leading: stats.leading,
        prVotes: stats.prVotes,
      };
    });
    paResults[provId].sort((a, b) => b.won + b.leading - (a.won + a.leading));
  }

  const totalDeclared = parties.reduce((s, p) => s + p.won, 0);
  const totalLeading = parties.reduce((s, p) => s + p.leading, 0);
  const totalPRVotes = parties.reduce((s, p) => s + p.prVotes, 0);

  const output = {
    lastUpdated: new Date().toISOString(),
    totalSeats: TOTAL_SEATS,
    fptpSeats: FPTP_SEATS,
    prSeats: PR_SEATS,
    parties,
    constituencies:
      results.constituencyData && results.constituencyData.length > 0
        ? results.constituencyData.map((c) => ({
            id: `${c.distId}-${c.constNo}`,
            name: c.name,
            province: c.province != null ? String(c.province) : "",
            status: c.status,
            totalVotes: c.totalVotes,
            candidates: c.candidates.map((cand) => ({
              name: cand.name,
              party: cand.party,
              partyShort: cand.partyShort,
              votes: cand.votes,
              color: cand.color,
            })),
          }))
        : existing.constituencies || [],
    paResults,
    summary: {
      totalSeats: TOTAL_SEATS,
      fptpSeats: FPTP_SEATS,
      prSeats: PR_SEATS,
      declared: totalDeclared,
      counting: totalLeading,
      pending: Math.max(0, FPTP_SEATS - totalDeclared - totalLeading),
      totalVotesCast: totalPRVotes,
    },
  };

  fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `  ✅ data.json written — ${parties.length} parties, ${output.constituencies.length} constituencies, ${Object.keys(paResults).length} provinces`
  );
}

// ---------------------------------------------------------------------------
// 7. Log scrape to scrape_log
// ---------------------------------------------------------------------------
async function logScrape(status, errorMessage) {
  if (!supabase) return;

  try {
    await supabase.from("scrape_log").insert({
      source: results.sources.join(", "),
      status,
      records_updated: results.recordsUpdated,
      error_message: errorMessage || null,
    });
  } catch (err) {
    console.warn(`  ⚠️  Failed to write scrape_log: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🗳️  Nepal Election Live — EC JSON Scraper");
  console.log("=".repeat(50));
  console.log(
    supabase ? "📡 Mode: Supabase + data.json" : "📁 Mode: data.json only"
  );
  console.log(`⏰ Started: ${new Date().toISOString()}`);

  const startTime = Date.now();

  // Step 1: HoR FPTP
  try {
    await fetchHoRFPTP();
  } catch (err) {
    console.error(`❌ HoR FPTP failed: ${err.message}`);
    results.errors.push(`fptp: ${err.message}`);
  }

  // Step 2: HoR PR
  try {
    await fetchHoRPR();
  } catch (err) {
    console.error(`❌ HoR PR failed: ${err.message}`);
    results.errors.push(`pr: ${err.message}`);
  }

  // Step 3: Probe additional endpoints
  try {
    await probeAdditionalEndpoints();
  } catch (err) {
    console.error(`❌ Probe failed: ${err.message}`);
    results.errors.push(`probe: ${err.message}`);
  }

  // Step 4: PA results
  try {
    await fetchPAResults();
  } catch (err) {
    console.error(`❌ PA results failed: ${err.message}`);
    results.errors.push(`pa: ${err.message}`);
  }

  // Step 5: Calculate PR seats
  let prSeatMap = {};
  try {
    prSeatMap = calculatePRSeats();
    await applyPRSeats(prSeatMap);
  } catch (err) {
    console.error(`❌ PR seat calculation failed: ${err.message}`);
    results.errors.push(`pr_seats: ${err.message}`);
  }

  // Step 5b: Constituency-level candidate data
  try {
    await fetchConstituencyCandidates();
  } catch (err) {
    console.error(`❌ Constituency candidates failed: ${err.message}`);
    results.errors.push(`constituency_cand: ${err.message}`);
  }

  // Step 6: Write data.json
  try {
    writeDataJSON(prSeatMap);
  } catch (err) {
    console.error(`❌ data.json write failed: ${err.message}`);
    results.errors.push(`data_json: ${err.message}`);
  }

  // Step 7: Log scrape
  const overallStatus = results.errors.length === 0 ? "success" : "partial";
  const errorSummary =
    results.errors.length > 0 ? results.errors.join("; ") : null;
  await logScrape(overallStatus, errorSummary);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n" + "=".repeat(50));
  console.log("📋 SCRAPE SUMMARY");
  console.log("=".repeat(50));
  console.log(`  ⏱️  Duration: ${elapsed}s`);
  console.log(`  📊 Parties tracked: ${Object.keys(results.parties).length}`);
  console.log(`  📍 Constituencies fetched: ${(results.constituencyData || []).length}`);
  console.log(`  👤 Candidates fetched: ${(results.constituencyData || []).reduce((s, c) => s + c.candidates.length, 0)}`);
  console.log(`  🏔️  Provinces fetched: ${Object.keys(results.pa).length}/7`);
  console.log(`  📝 Records updated: ${results.recordsUpdated}`);
  console.log(`  📡 Sources: ${results.sources.length} endpoints`);

  // Probe endpoint summary
  const probeKeys = Object.keys(results.probeResults);
  if (probeKeys.length > 0) {
    console.log(`  🔍 Probed endpoints:`);
    for (const key of probeKeys) {
      const r = results.probeResults[key];
      console.log(`     ${r.available ? "✅" : "⬜"} ${r.file}`);
    }
  }

  if (results.errors.length > 0) {
    console.log(`  ⚠️  Errors (${results.errors.length}):`);
    for (const err of results.errors) {
      console.log(`     ❌ ${err}`);
    }
  } else {
    console.log("  ✅ All sections completed successfully");
  }

  console.log("=".repeat(50));

  // Print party standings
  const standings = Object.entries(results.parties)
    .map(([name, stats]) => ({
      name,
      won: stats.won,
      leading: stats.leading,
      prVotes: stats.prVotes,
      prSeats: prSeatMap[name] || 0,
    }))
    .filter((p) => p.won > 0 || p.leading > 0 || p.prSeats > 0)
    .sort((a, b) => b.won + b.prSeats - (a.won + a.prSeats));

  if (standings.length > 0) {
    console.log("\n🏛️  PARTY STANDINGS");
    console.log(
      "Party".padEnd(25) +
        "FPTP Won".padStart(10) +
        "Leading".padStart(10) +
        "PR Seats".padStart(10) +
        "Total".padStart(8)
    );
    console.log("-".repeat(63));
    for (const p of standings) {
      console.log(
        p.name.padEnd(25) +
          String(p.won).padStart(10) +
          String(p.leading).padStart(10) +
          String(p.prSeats).padStart(10) +
          String(p.won + p.prSeats).padStart(8)
      );
    }
    console.log("-".repeat(63));
    const totals = standings.reduce(
      (acc, p) => ({
        won: acc.won + p.won,
        leading: acc.leading + p.leading,
        prSeats: acc.prSeats + p.prSeats,
      }),
      { won: 0, leading: 0, prSeats: 0 }
    );
    console.log(
      "TOTAL".padEnd(25) +
        String(totals.won).padStart(10) +
        String(totals.leading).padStart(10) +
        String(totals.prSeats).padStart(10) +
        String(totals.won + totals.prSeats).padStart(8)
    );
  }

  // Check if all constituencies are declared — log recommendation to reduce polling
  if (supabase) {
    try {
      const { data: pending } = await supabase
        .from("constituencies")
        .select("id")
        .neq("status", "declared");
      if (!pending || pending.length === 0) {
        console.log("\n🏁 All 165 constituencies declared! Consider reducing polling frequency.");
        console.log("   Update .github/workflows/scrape.yml cron to '0 */1 * * *' (hourly)");
      }
    } catch (err) {
      // Non-critical — ignore
    }
  }

  console.log(`\n🎉 Scrape complete!`);
}

main().catch((err) => {
  console.error("💥 Fatal scraper error:", err);
  logScrape("error", err.message).finally(() => process.exit(1));
});
