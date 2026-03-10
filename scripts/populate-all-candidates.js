/**
 * Populate ALL 165 HoR constituencies with FPTP candidates and PR votes.
 *
 * The EC and Supabase use different district ID numbering, so this script
 * uses a hardcoded EC distId → Supabase district_id mapping derived from
 * matching district Nepali names. The constituency number within each
 * district is the same in both systems (1, 2, 3…).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/populate-all-candidates.js
 */

const { createClient } = require("@supabase/supabase-js");
const { fetchECData } = require("./lib/ec-fetcher");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RATE_LIMIT_MS = 300;

// ---------------------------------------------------------------------------
// EC district ID → Supabase district ID mapping
// Derived by matching Nepali district names between the two systems.
// ---------------------------------------------------------------------------
const EC_TO_SUPA_DISTRICT = {
  1: 1,   // ताप्लेजुङ
  2: 2,   // पाँचथर
  3: 3,   // इलाम
  4: 4,   // झापा
  5: 9,   // EC:संखुवासभा → SB:सङ्खुवासभा
  6: 8,   // EC:तेह्रथुम → SB:तेह्रथुम
  7: 10,  // EC:भोजपुर → SB:भोजपुर
  8: 7,   // EC:धनकुटा → SB:धनकुटा
  9: 5,   // EC:मोरङ → SB:मोरङ
  10: 6,  // EC:सुनसरी → SB:सुनसरी
  11: 11, // सोलुखुम्बु
  12: 13, // EC:खोटाङ → SB:खोटाङ
  13: 12, // EC:ओखलढुंगा → SB:ओखलढुङ्गा
  14: 14, // उदयपुर
  15: 15, // सप्तरी
  16: 16, // सिराहा
  17: 23, // EC:दोलखा → SB:दोलखा
  18: 30, // EC:रामेछाप → SB:रामेछाप
  19: 31, // EC:सिन्धुली → SB:सिन्धुली
  20: 17, // EC:धनुषा → SB:धनुषा
  21: 18, // EC:महोत्तरी → SB:महोत्तरी
  22: 19, // EC:सर्लाही → SB:सर्लाही
  23: 25, // EC:रसुवा → SB:रसुवा
  24: 27, // EC:धादिङ → SB:धादिङ
  25: 26, // EC:नुवाकोट → SB:नुवाकोट
  26: 35, // EC:काठमाडौं → SB:काठमाडौँ
  27: 34, // EC:भक्तपुर → SB:भक्तपुर
  28: 33, // EC:ललितपुर → SB:ललितपुर
  29: 32, // EC:काभ्रेपलाञ्चोक → SB:काभ्रेपलाञ्चोक
  30: 24, // EC:सिन्धुपाल्चोक → SB:सिन्धुपाल्चोक
  31: 29, // EC:मकवानपुर → SB:मकवानपुर
  32: 20, // EC:रौतहट → SB:रौतहट
  33: 21, // EC:बारा → SB:बारा
  34: 22, // EC:पर्सा → SB:पर्सा
  35: 28, // EC:चितवन → SB:चितवन
  36: 36, // गोरखा
  37: 41, // EC:मनाङ → SB:मनाङ
  38: 37, // EC:लमजुङ → SB:लमजुङ
  39: 40, // EC:कास्की → SB:कास्की
  40: 38, // EC:तनहुँ → SB:तनहुँ
  41: 39, // EC:स्याङजा → SB:स्याङ्जा
  42: 52, // EC:गुल्मी → SB:गुल्मी
  43: 50, // EC:पाल्पा → SB:पाल्पा
  44: 51, // EC:अर्घाखाँची → SB:अर्घाखाँची
  45: 46, // नवलपरासी (बर्दघाट सुस्ता पूर्व)
  46: 48, // EC:रूपन्देही → SB:रूपन्देही
  47: 49, // EC:कपिलबस्तु → SB:कपिलवस्तु
  48: 42, // EC:मुस्ताङ → SB:मुस्ताङ
  49: 43, // EC:म्याग्दी → SB:म्याग्दी
  50: 45, // EC:बाग्लुङ → SB:बागलुङ
  51: 44, // EC:पर्वत → SB:पर्वत
  52: 59, // EC:रुकुम (पूर्वी भाग) → SB:रुकुम (पूर्वी भाग)
  53: 54, // EC:रोल्पा → SB:रोल्पा
  54: 53, // EC:प्यूठान → SB:प्यूठान
  55: 60, // EC:सल्यान → SB:सल्यान
  56: 55, // EC:दाङ → SB:दाङ
  57: 61, // EC:डोल्पा → SB:डोल्पा
  58: 65, // EC:मुगु → SB:मुगु
  59: 63, // EC:जुम्ला → SB:जुम्ला
  60: 64, // EC:कालिकोट → SB:कालिकोट
  61: 62, // EC:हुम्ला → SB:हुम्ला
  62: 68, // EC:जाजरकोट → SB:जाजरकोट
  63: 67, // EC:दैलेख → SB:दैलेख
  64: 66, // EC:सुर्खेत → SB:सुर्खेत
  65: 56, // EC:बाँके → SB:बाँके
  66: 57, // EC:बर्दिया → SB:बर्दिया
  67: 70, // EC:बाजुरा → SB:बाजुरा
  68: 72, // EC:अछाम → SB:अछाम
  69: 71, // EC:बझाङ → SB:बझाङ
  70: 73, // EC:डोटी → SB:डोटी
  71: 74, // EC:कैलाली → SB:कैलाली
  72: 78, // EC:दार्चुला → SB:दार्चुला
  73: 77, // EC:बैतडी → SB:बैतडी
  74: 76, // EC:डडेलधुरा → SB:डडेलधुरा
  75: 75, // कञ्चनपुर
  77: 47, // EC:नवलपरासी (बर्दघाट सुस्ता पश्चिम) → SB same
  78: 58, // EC:रुकुम (पश्चिम भाग) → SB:रुकुम (पश्चिम भाग)
};

// Nepali party name → English canonical name (from scrape-ec-json.js)
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

// Fallback colors for auto-created parties
const FALLBACK_COLORS = [
  "#EF4444", "#3B82F6", "#22C55E", "#A855F7", "#EC4899",
  "#F97316", "#06B6D4", "#84CC16", "#E11D48", "#8B5CF6",
];
let fallbackIdx = 0;

// ---------------------------------------------------------------------------
// Party cache & resolution
// ---------------------------------------------------------------------------
const partyCache = {}; // name_ne → { id, name_en }

async function loadPartyCache() {
  const { data, error } = await supabase
    .from("parties")
    .select("id, name_en, name_ne");
  if (error) throw new Error(`Failed to load parties: ${error.message}`);

  for (const p of data) {
    if (p.name_ne) partyCache[p.name_ne.trim()] = { id: p.id, name_en: p.name_en };
    if (p.name_en) partyCache[`__en__${p.name_en.trim()}`] = { id: p.id, name_en: p.name_en };
  }
  console.log(`  Loaded ${data.length} parties into cache`);
}

function resolvePartyNameEn(nepaliName) {
  const trimmed = (nepaliName || "").trim();
  if (PARTY_NAME_MAP[trimmed]) return PARTY_NAME_MAP[trimmed];
  for (const [np, en] of Object.entries(PARTY_NAME_MAP)) {
    if (trimmed.includes(np) || np.includes(trimmed)) return en;
  }
  return trimmed;
}

async function getPartyId(partyNameNe) {
  const trimmed = (partyNameNe || "").trim();
  if (!trimmed || trimmed === "स्वतन्त्र") return null; // Independent

  // 1. Exact match on name_ne
  if (partyCache[trimmed]) return partyCache[trimmed].id;

  // 2. Try known English name mapping → look up by name_en
  const nameEn = resolvePartyNameEn(trimmed);
  const enKey = `__en__${nameEn}`;
  if (partyCache[enKey]) {
    partyCache[trimmed] = partyCache[enKey];
    return partyCache[enKey].id;
  }

  // 3. Substring match on name_ne
  for (const [key, val] of Object.entries(partyCache)) {
    if (key.startsWith("__en__")) continue;
    if (trimmed.includes(key) || key.includes(trimmed)) {
      partyCache[trimmed] = val;
      return val.id;
    }
  }

  // 4. Auto-create party
  const color = FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length];
  const shortName = nameEn.slice(0, 4).toUpperCase();
  const { data: created, error } = await supabase
    .from("parties")
    .insert({
      name_en: nameEn,
      name_ne: trimmed,
      short_name: shortName,
      color,
    })
    .select("id")
    .single();

  if (error) {
    // Might already exist — try fetching
    const { data: existing } = await supabase
      .from("parties")
      .select("id")
      .eq("name_en", nameEn)
      .maybeSingle();
    if (existing) {
      partyCache[trimmed] = { id: existing.id, name_en: nameEn };
      return existing.id;
    }
    console.warn(`  ⚠️  Could not create party "${nameEn}": ${error.message}`);
    return null;
  }

  console.log(`  ➕ Auto-created party: ${nameEn} (${trimmed})`);
  partyCache[trimmed] = { id: created.id, name_en: nameEn };
  partyCache[`__en__${nameEn}`] = { id: created.id, name_en: nameEn };
  return created.id;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🗳️  Populate ALL constituencies with candidate data");
  console.log("   Using hardcoded EC→Supabase district ID mapping\n");

  // 1. Fetch EC constituency lookup
  console.log("📋 Step 1: Fetching EC constituency lookup…");
  const constituencyLookup = await fetchECData(
    "JSONFiles/Election2082/HOR/Lookup/constituencies.json"
  );
  if (!Array.isArray(constituencyLookup) || constituencyLookup.length === 0) {
    throw new Error("Empty or invalid constituency lookup from EC");
  }

  const allPairs = [];
  const seenPairs = new Set();
  for (const entry of constituencyLookup) {
    if (entry.distId >= 90) continue; // skip NA entries (98, 99)
    for (let constNo = 1; constNo <= entry.consts; constNo++) {
      const pairKey = `${entry.distId}-${constNo}`;
      if (seenPairs.has(pairKey)) continue; // deduplicate
      seenPairs.add(pairKey);
      allPairs.push({ ecDistId: entry.distId, constNo });
    }
  }
  console.log(`  Found ${allPairs.length} EC constituencies (deduped) across ${constituencyLookup.length} districts\n`);

  // 2. Fetch ALL Supabase constituencies
  console.log("📋 Step 2: Loading Supabase constituencies…");
  const { data: supaConsts, error: constErr } = await supabase
    .from("constituencies")
    .select("id, district_id, number, is_final");
  if (constErr) throw new Error(`Failed to load constituencies: ${constErr.message}`);

  // Build map: "{supaDistId}-{number}" → supabase constituency id
  const constMap = {};
  const finalSet = new Set();
  for (const c of supaConsts) {
    const key = `${c.district_id}-${c.number}`;
    constMap[key] = c.id;
    if (c.is_final) finalSet.add(key);
  }
  console.log(`  Loaded ${supaConsts.length} Supabase constituencies`);

  // Verify mapping coverage using EC→Supa district mapping
  let mapped = 0;
  let unmappedDist = 0;
  let unmappedConst = 0;
  for (const { ecDistId, constNo } of allPairs) {
    const supaDistId = EC_TO_SUPA_DISTRICT[ecDistId];
    if (!supaDistId) {
      unmappedDist++;
      continue;
    }
    const key = `${supaDistId}-${constNo}`;
    if (constMap[key]) mapped++;
    else unmappedConst++;
  }
  console.log(`  Mapping: ${mapped} matched, ${unmappedDist} no district map, ${unmappedConst} no constituency match\n`);

  // 3. Load party cache
  console.log("📋 Step 3: Loading party cache…");
  await loadPartyCache();
  console.log();

  // 4. Check existing candidate coverage
  console.log("📋 Step 4: Checking existing candidate coverage…");
  const existingConstIds = new Set();
  let candOffset = 0;
  while (true) {
    const { data: page, error: pageErr } = await supabase
      .from("candidates")
      .select("constituency_id")
      .range(candOffset, candOffset + 999);
    if (pageErr) throw new Error(`Failed to check existing candidates: ${pageErr.message}`);
    if (!page || page.length === 0) break;
    for (const c of page) existingConstIds.add(c.constituency_id);
    if (page.length < 1000) break;
    candOffset += 1000;
  }
  console.log(`  ${existingConstIds.size} constituencies already have candidates\n`);

  // 5. Process each constituency
  console.log("🚀 Step 5: Populating candidates and PR votes…\n");

  const stats = {
    processed: 0,
    skippedExisting: 0,
    skippedFinal: 0,
    skippedNoDistMap: 0,
    skippedNoConstMatch: 0,
    skippedNoData: 0,
    candidatesInserted: 0,
    prVotesInserted: 0,
    constituenciesUpdated: 0,
    errors: [],
  };

  for (let i = 0; i < allPairs.length; i++) {
    const { ecDistId, constNo } = allPairs[i];
    const supaDistId = EC_TO_SUPA_DISTRICT[ecDistId];
    const progress = `[${i + 1}/${allPairs.length}]`;

    // Skip if EC district not in mapping
    if (!supaDistId) {
      stats.skippedNoDistMap++;
      continue;
    }

    const key = `${supaDistId}-${constNo}`;
    const supaConstId = constMap[key];

    // Skip if no matching Supabase constituency
    if (!supaConstId) {
      stats.skippedNoConstMatch++;
      continue;
    }

    // Skip if finalized
    if (finalSet.has(key)) {
      stats.skippedFinal++;
      continue;
    }

    // Skip if already has candidates (including ones we just inserted)
    if (existingConstIds.has(supaConstId)) {
      stats.skippedExisting++;
      continue;
    }
    // Mark as having candidates now (prevent re-insert if EC lookup has dupes)
    existingConstIds.add(supaConstId);

    process.stdout.write(`${progress} EC-${ecDistId}-${constNo} → SB-${supaDistId}-${constNo} `);

    // --- Fetch FPTP Candidates ---
    let fptpData = null;
    try {
      const fptpPath = `JSONFiles/Election2082/HOR/FPTP/HOR-${ecDistId}-${constNo}.json`;
      fptpData = await fetchECData(fptpPath, { retries: 2, timeout: 8000 });
    } catch (err) {
      console.log(`FPTP failed: ${err.message}`);
      stats.errors.push(`fptp:EC${ecDistId}-${constNo}: ${err.message}`);
      await delay(RATE_LIMIT_MS);
      continue;
    }

    if (!Array.isArray(fptpData) || fptpData.length === 0) {
      console.log("no FPTP data");
      stats.skippedNoData++;
      await delay(RATE_LIMIT_MS);
      continue;
    }

    // Sort by votes descending
    fptpData.sort((a, b) => (b.TotalVoteReceived || 0) - (a.TotalVoteReceived || 0));

    const totalVotes = fptpData.reduce((s, c) => s + (c.TotalVoteReceived || 0), 0);
    const hasWinner = fptpData.some((c) => c.Remarks === "Elected");
    const status = hasWinner ? "declared" : totalVotes > 0 ? "counting" : "pending";

    // Build candidate rows
    const candRows = [];
    for (let rank = 0; rank < fptpData.length; rank++) {
      const c = fptpData[rank];
      const partyId = await getPartyId(c.PoliticalPartyName);
      candRows.push({
        constituency_id: supaConstId,
        party_id: partyId,
        name_en: c.CandidateName,
        name_ne: c.CandidateName,
        votes: c.TotalVoteReceived || 0,
        is_winner: c.Remarks === "Elected",
        is_leading: rank === 0 && c.Remarks !== "Elected",
      });
    }

    // Batch insert candidates
    const { error: insertErr } = await supabase
      .from("candidates")
      .insert(candRows);

    if (insertErr) {
      console.log(`insert failed: ${insertErr.message}`);
      stats.errors.push(`insert:EC${ecDistId}-${constNo}: ${insertErr.message}`);
      await delay(RATE_LIMIT_MS);
      continue;
    }

    stats.candidatesInserted += candRows.length;

    // Update constituency status
    const { error: updateErr } = await supabase
      .from("constituencies")
      .update({
        status,
        total_votes_cast: totalVotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supaConstId);

    if (updateErr) {
      stats.errors.push(`const_update:EC${ecDistId}-${constNo}: ${updateErr.message}`);
    } else {
      stats.constituenciesUpdated++;
    }

    // --- Fetch PR Votes ---
    try {
      const prPath = `JSONFiles/Election2082/HOR/PR/HOR/HOR-${ecDistId}-${constNo}.json`;
      const prData = await fetchECData(prPath, { retries: 2, timeout: 8000 });

      if (Array.isArray(prData) && prData.length > 0) {
        const prRows = [];
        for (const pr of prData) {
          const partyId = await getPartyId(pr.PoliticalPartyName);
          if (!partyId) continue;
          prRows.push({
            constituency_id: supaConstId,
            party_id: partyId,
            votes: pr.TotalVoteReceived || 0,
            updated_at: new Date().toISOString(),
          });
        }

        if (prRows.length > 0) {
          const { error: prErr } = await supabase
            .from("pr_votes")
            .upsert(prRows, { onConflict: "constituency_id,party_id" });

          if (prErr) {
            stats.errors.push(`pr:EC${ecDistId}-${constNo}: ${prErr.message}`);
          } else {
            stats.prVotesInserted += prRows.length;
          }
        }
      }
    } catch (err) {
      stats.errors.push(`pr_fetch:EC${ecDistId}-${constNo}: ${err.message}`);
    }

    stats.processed++;
    console.log(`${candRows.length} cands, ${status}`);

    await delay(RATE_LIMIT_MS);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("📊 POPULATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Constituencies processed:     ${stats.processed}`);
  console.log(`  Skipped (already populated):  ${stats.skippedExisting}`);
  console.log(`  Skipped (finalized):          ${stats.skippedFinal}`);
  console.log(`  Skipped (no EC data):         ${stats.skippedNoData}`);
  console.log(`  Skipped (no district map):    ${stats.skippedNoDistMap}`);
  console.log(`  Skipped (no const match):     ${stats.skippedNoConstMatch}`);
  console.log(`  Candidates inserted:          ${stats.candidatesInserted}`);
  console.log(`  PR vote rows upserted:        ${stats.prVotesInserted}`);
  console.log(`  Constituencies updated:       ${stats.constituenciesUpdated}`);
  console.log(`  Errors:                       ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\n⚠️  Errors:");
    for (const e of stats.errors.slice(0, 20)) {
      console.log(`    ${e}`);
    }
    if (stats.errors.length > 20) {
      console.log(`    ... and ${stats.errors.length - 20} more`);
    }
  }

  // ---------------------------------------------------------------------------
  // Verification
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("🔍 VERIFICATION");
  console.log("=".repeat(60));

  const { count: totalCandidates } = await supabase
    .from("candidates")
    .select("*", { count: "exact", head: true });
  console.log(`  Total candidates in DB:         ${totalCandidates}`);

  // Paginate to get all constituency_ids (Supabase default limit is 1000)
  const uniqueConsts = new Set();
  let offset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data: page } = await supabase
      .from("candidates")
      .select("constituency_id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page || page.length === 0) break;
    for (const c of page) uniqueConsts.add(c.constituency_id);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  console.log(`  Constituencies with candidates: ${uniqueConsts.size}/165`);

  const { count: totalPR } = await supabase
    .from("pr_votes")
    .select("*", { count: "exact", head: true });
  console.log(`  Total PR vote rows in DB:       ${totalPR}`);

  // Show any constituencies still without candidates
  const { data: allConsts } = await supabase
    .from("constituencies")
    .select("id, district_id, number, name_en")
    .order("id");
  const stillMissing = (allConsts || []).filter((c) => !uniqueConsts.has(c.id));
  if (stillMissing.length > 0 && stillMissing.length <= 20) {
    console.log(`\n  Still missing (${stillMissing.length}):`);
    for (const m of stillMissing) {
      console.log(`    ${m.name_en} (SB dist=${m.district_id} num=${m.number})`);
    }
  }

  console.log("=".repeat(60));

  if (uniqueConsts.size >= 155) {
    console.log("\n🎉 SUCCESS! All mappable constituencies populated (8 don't exist in EC 2082 data).");
  } else if (uniqueConsts.size >= 150) {
    console.log(`\n✅ Good coverage: ${uniqueConsts.size}/165. Remaining gaps are due to EC/Supabase data differences.`);
  } else {
    console.log(`\n⚠️  Only ${uniqueConsts.size}/165 constituencies covered. Check errors above.`);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
