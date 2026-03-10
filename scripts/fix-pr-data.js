/**
 * Fix party PR vote totals and EC Symbol IDs using authoritative EC data.
 * Also recalculates PR seat allocation using Sainte-Laguë method.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node fix-pr-data.js
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://lorrugedmqbjrxodxgdh.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_SERVICE_KEY env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PR_SEATS = 110;
const PR_THRESHOLD = 0.03; // 3%

const FALLBACK_COLORS = [
  "#6B7280", "#94A3B8", "#78716C", "#A1A1AA", "#9CA3AF",
  "#D4D4D8", "#CBD5E1", "#E7E5E4", "#F1F5F9", "#F5F5F4",
];

// ─── Complete EC PR data — all 57 parties ───────────────────────────────────
const EC_PR_DATA = [
  { name_ne: "राष्ट्रिय स्वतन्त्र पार्टी", symbolId: 2528, prVotes: 4945558 },
  { name_ne: "नेपाली काँग्रेस", symbolId: 2583, prVotes: 1672914 },
  { name_ne: "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)", symbolId: 2598, prVotes: 1388432 },
  { name_ne: "नेपाली कम्युनिष्ट पार्टी", symbolId: 2557, prVotes: 752441 },
  { name_ne: "श्रम संस्कृति पार्टी", symbolId: 2501, prVotes: 347167 },
  { name_ne: "राष्ट्रिय प्रजातन्त्र पार्टी", symbolId: 2604, prVotes: 322409 },
  { name_ne: "जनता समाजवादी पार्टी, नेपाल", symbolId: 2542, prVotes: 169413 },
  { name_ne: "राष्ट्रिय परिवर्तन पार्टी", symbolId: 2568, prVotes: 164766 },
  { name_ne: "जनमत पार्टी", symbolId: 2585, prVotes: 75468 },
  { name_ne: "एकल चिन्ह चकिया (जाँतो) (राष्ट्रिय मुक्ति पार्टी नेपाल/जनता समाजवादी पार्टी/नागरिक उन्मुक्ति पार्टी, नेपाल)", symbolId: 2531, prVotes: 60384 },
  { name_ne: "नेपाल मजदुर किसान पार्टी", symbolId: 2578, prVotes: 41879 },
  { name_ne: "राष्ट्र निर्माण दल नेपाल", symbolId: 2527, prVotes: 37707 },
  { name_ne: "राष्ट्रिय जनमोर्चा", symbolId: 2522, prVotes: 29208 },
  { name_ne: "एकल चिन्ह बस (नेपाल संघीय समाजवादी पार्टी/बहुजन एकता पार्टी नेपाल/नेपाल जनजागृति पार्टी)", symbolId: 2567, prVotes: 27685 },
  { name_ne: "नेपाल जनता संरक्षण पार्टी", symbolId: 2541, prVotes: 26934 },
  { name_ne: "प्रगतिशील लोकतान्त्रिक पार्टी", symbolId: 2516, prVotes: 23459 },
  { name_ne: "नेपाल कम्युनिस्ट पार्टी (माओवादी)", symbolId: 2526, prVotes: 23243 },
  { name_ne: "मंगोल नेशनल अर्गनाइजेशन", symbolId: 2511, prVotes: 19037 },
  { name_ne: "सार्वभौम नागरिक पार्टी", symbolId: 2520, prVotes: 14091 },
  { name_ne: "एकल चिन्ह मोबाइल (आम जनता पार्टी/जनादेश पार्टी नेपाल)", symbolId: 2581, prVotes: 12632 },
  { name_ne: "राष्ट्रिय मुक्ति आन्दोलन, नेपाल", symbolId: 2591, prVotes: 9898 },
  { name_ne: "संयुक्त नागरिक पार्टी", symbolId: 2521, prVotes: 8481 },
  { name_ne: "स्वाभिमान पार्टी", symbolId: 2569, prVotes: 7173 },
  { name_ne: "नेपाल जनता पार्टी", symbolId: 2507, prVotes: 6952 },
  { name_ne: "राष्ट्रिय एकता दल", symbolId: 2548, prVotes: 6788 },
  { name_ne: "राष्ट्रिय जनमुक्ति पार्टी", symbolId: 2605, prVotes: 6671 },
  { name_ne: "नेपाल कम्युनिष्ट पार्टी (मार्क्सवादी-लेनिनवादी)", symbolId: 2602, prVotes: 5792 },
  { name_ne: "नेशनल रिपब्लिक नेपाल", symbolId: 2504, prVotes: 5013 },
  { name_ne: "नेपालका लागि नेपाली पार्टी", symbolId: 2524, prVotes: 4816 },
  { name_ne: "नेपाल कम्युनिष्ट पार्टी मार्क्सवादी (पुष्पलाल)", symbolId: 2523, prVotes: 4719 },
  { name_ne: "राष्ट्रिय गौरव पार्टी", symbolId: 2558, prVotes: 4712 },
  { name_ne: "संघीय लोकतान्त्रिक राष्ट्रिय मञ्च", symbolId: 2550, prVotes: 4532 },
  { name_ne: "नेपाल कम्युनिष्ट पार्टी (संयुक्त)", symbolId: 2601, prVotes: 4313 },
  { name_ne: "राष्ट्रिय उर्जाशील पार्टी, नेपाल", symbolId: 2534, prVotes: 4232 },
  { name_ne: "समावेशी समाजवादी पार्टी नेपाल", symbolId: 2572, prVotes: 4111 },
  { name_ne: "गतिशील लोकतान्त्रिक पार्टी", symbolId: 2571, prVotes: 4007 },
  { name_ne: "नेपाल लोकतान्त्रिक पार्टी", symbolId: 2553, prVotes: 3787 },
  { name_ne: "नेपाल मातृभूमि पार्टी", symbolId: 2565, prVotes: 3075 },
  { name_ne: "राष्ट्रिय जनता पार्टी नेपाल", symbolId: 2551, prVotes: 2785 },
  { name_ne: "जय मातृभूमि पार्टी", symbolId: 2510, prVotes: 2671 },
  { name_ne: "बहुजन शक्ति पार्टी", symbolId: 2536, prVotes: 2644 },
  { name_ne: "नेपाल जनमुक्ति पार्टी", symbolId: 2529, prVotes: 2090 },
  { name_ne: "प्रजातान्त्रिक पार्टी नेपाल", symbolId: 2582, prVotes: 2068 },
  { name_ne: "जन अधिकार पार्टी", symbolId: 2540, prVotes: 1954 },
  { name_ne: "नेपाल सद्\u200Dभावना पार्टी", symbolId: 2555, prVotes: 1889 },
  { name_ne: "नेपाली काँग्रेस (वी.पी.)", symbolId: 2509, prVotes: 1691 },
  { name_ne: "पिपुल फर्ष्ट पार्टी", symbolId: 2552, prVotes: 1682 },
  { name_ne: "नागरिक शक्ति, नेपाल", symbolId: 2549, prVotes: 1643 },
  { name_ne: "नेपाली जनश्रमदान संस्कृति पार्टी", symbolId: 2579, prVotes: 1504 },
  { name_ne: "नेपाली जनता दल", symbolId: 2595, prVotes: 1374 },
  { name_ne: "समावेशी समाजवादी पार्टी", symbolId: 2590, prVotes: 1296 },
  { name_ne: "जनता लोकतान्त्रिक पार्टी, नेपाल", symbolId: 2574, prVotes: 1238 },
  { name_ne: "एकल चिन्ह जगर भएको सिंह(सचेत नेपाली पार्टी/नागरिक सर्वोच्चता पार्टी नेपाल)", symbolId: 2537, prVotes: 1085 },
  { name_ne: "जनप्रिय लोकतान्त्रिक पार्टी", symbolId: 2564, prVotes: 893 },
  { name_ne: "मितेरी पार्टी नेपाल", symbolId: 2530, prVotes: 738 },
  { name_ne: "उन्\u200Dनत लोकतन्त्र पार्टी", symbolId: 2515, prVotes: 695 },
  { name_ne: "त्रिमुल नेपाल", symbolId: 2505, prVotes: 642 },
];

// Known Nepali → English name mappings (for parties seeded with English names)
const NEPALI_TO_ENGLISH = {
  "राष्ट्रिय स्वतन्त्र पार्टी": "RSP",
  "नेपाली काँग्रेस": "Nepali Congress",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)": "CPN-UML",
  "नेपाली कम्युनिष्ट पार्टी": "CPN-Maoist Centre",
  "राष्ट्रिय प्रजातन्त्र पार्टी": "RPP",
  "श्रम संस्कृति पार्टी": "Shram Sanskriti Party",
  "जनता समाजवादी पार्टी, नेपाल": "Janata Samajbadi",
  "जनता समाजवादी पार्टी": "Janata Samajbadi",
  "जनमत पार्टी": "Janamat Party",
  "राष्ट्रिय परिवर्तन पार्टी": "Rastriya Pariwartan Party",
};

// ─── Sainte-Laguë PR seat allocation ────────────────────────────────────────
function calculatePRSeats(partyVotes) {
  const totalPRVotes = partyVotes.reduce((sum, p) => sum + p.prVotes, 0);
  if (totalPRVotes === 0) return {};

  const threshold = totalPRVotes * PR_THRESHOLD;
  console.log(
    `\n📐 Sainte-Laguë PR seat allocation`
  );
  console.log(
    `   Total PR votes: ${totalPRVotes.toLocaleString()} | 3% threshold: ${Math.ceil(threshold).toLocaleString()}`
  );

  const qualifying = partyVotes.filter((p) => p.prVotes >= threshold);
  console.log(`   ✅ ${qualifying.length} parties qualify (≥3% threshold)\n`);

  if (qualifying.length === 0) return {};

  // Generate quotients: divisors 1, 3, 5, 7, 9, …
  const quotients = [];
  for (const party of qualifying) {
    for (let i = 0; i < PR_SEATS; i++) {
      const divisor = 2 * i + 1;
      quotients.push({
        dbId: party.dbId,
        name: party.matchedName,
        quotient: party.prVotes / divisor,
      });
    }
  }

  quotients.sort((a, b) => b.quotient - a.quotient);
  const allocated = quotients.slice(0, PR_SEATS);

  const seatMap = {};
  for (const q of allocated) {
    seatMap[q.dbId] = (seatMap[q.dbId] || { seats: 0, name: q.name });
    seatMap[q.dbId].seats++;
  }

  return seatMap;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔧 Fix PR Party Data — Authoritative EC Update\n");

  // Step 1: Fetch all existing parties from DB
  console.log("📥 Fetching existing parties from DB…");
  const { data: dbParties, error: fetchErr } = await supabase
    .from("parties")
    .select("id, name_en, name_ne, short_name, pr_votes, pr_seats, ec_symbol_id");

  if (fetchErr) {
    console.error("❌ Failed to fetch parties:", fetchErr.message);
    process.exit(1);
  }
  console.log(`   Found ${dbParties.length} parties in DB\n`);

  // Build lookup indexes
  const byNameNe = {};
  const byNameEn = {};
  for (const p of dbParties) {
    if (p.name_ne) byNameNe[p.name_ne.trim()] = p;
    if (p.name_en) byNameEn[p.name_en.trim()] = p;
  }

  // Step 2: Match and update each EC party
  console.log("🔄 Matching and updating parties…\n");
  let updated = 0;
  let created = 0;
  let errors = 0;
  const partyVotesForSeats = []; // For PR seat calculation
  const matchedDbIds = new Set(); // Track already-matched DB parties

  for (const ec of EC_PR_DATA) {
    let dbParty = null;
    let matchMethod = "";

    // Try 1: exact name_ne match
    if (byNameNe[ec.name_ne] && !matchedDbIds.has(byNameNe[ec.name_ne].id)) {
      dbParty = byNameNe[ec.name_ne];
      matchMethod = "name_ne";
    }

    // Try 2: known English mapping → match by name_en
    if (!dbParty && NEPALI_TO_ENGLISH[ec.name_ne]) {
      const enName = NEPALI_TO_ENGLISH[ec.name_ne];
      if (byNameEn[enName] && !matchedDbIds.has(byNameEn[enName].id)) {
        dbParty = byNameEn[enName];
        matchMethod = `name_en (${enName})`;
      }
    }

    // Try 3: check if the Nepali name was stored as name_en (scraper fallback)
    if (!dbParty && byNameEn[ec.name_ne] && !matchedDbIds.has(byNameEn[ec.name_ne].id)) {
      dbParty = byNameEn[ec.name_ne];
      matchMethod = "name_ne-as-name_en";
    }

    // Try 4: fuzzy substring match on name_ne (skip already-matched and alliances)
    // Only use fuzzy for non-alliance parties (alliances contain "/" in name)
    if (!dbParty && !ec.name_ne.includes("/")) {
      for (const p of dbParties) {
        if (!p.name_ne || matchedDbIds.has(p.id)) continue;
        const dbNe = p.name_ne.trim();
        const ecNe = ec.name_ne.trim();
        if (dbNe.includes(ecNe) || ecNe.includes(dbNe)) {
          dbParty = p;
          matchMethod = `fuzzy name_ne ("${dbNe}")`;
          break;
        }
      }
    }

    if (dbParty) {
      matchedDbIds.add(dbParty.id);
      // Update existing party
      const { error: upErr } = await supabase
        .from("parties")
        .update({
          pr_votes: ec.prVotes,
          ec_symbol_id: ec.symbolId,
          name_ne: ec.name_ne, // Ensure name_ne matches EC exactly
          updated_at: new Date().toISOString(),
        })
        .eq("id", dbParty.id);

      if (upErr) {
        console.log(`   ❌ FAILED updating "${ec.name_ne}" (id=${dbParty.id}): ${upErr.message}`);
        errors++;
      } else {
        console.log(`   ✅ Updated [${matchMethod}] ${ec.name_ne} → ${dbParty.name_en} | votes=${ec.prVotes.toLocaleString()}`);
        updated++;
      }

      partyVotesForSeats.push({
        dbId: dbParty.id,
        matchedName: dbParty.name_en || ec.name_ne,
        prVotes: ec.prVotes,
      });
    } else {
      // Create new party
      const shortName = ec.name_ne.slice(0, 6);
      const colorIdx = created % FALLBACK_COLORS.length;
      const { data: newParty, error: insErr } = await supabase
        .from("parties")
        .insert({
          name_en: ec.name_ne, // Use Nepali name as English fallback
          name_ne: ec.name_ne,
          short_name: shortName,
          color: FALLBACK_COLORS[colorIdx],
          pr_votes: ec.prVotes,
          ec_symbol_id: ec.symbolId,
        })
        .select("id")
        .single();

      if (insErr) {
        console.log(`   ❌ FAILED creating "${ec.name_ne}": ${insErr.message}`);
        errors++;
      } else {
        console.log(`   🆕 Created "${ec.name_ne}" (id=${newParty.id}) | votes=${ec.prVotes.toLocaleString()}`);
        created++;
        partyVotesForSeats.push({
          dbId: newParty.id,
          matchedName: ec.name_ne,
          prVotes: ec.prVotes,
        });
      }
    }
  }

  console.log(`\n📊 Summary: ${updated} updated, ${created} created, ${errors} errors\n`);

  // Step 3: Recalculate PR seats
  const seatMap = calculatePRSeats(partyVotesForSeats);

  // Reset all PR seats to 0
  const { error: resetErr } = await supabase
    .from("parties")
    .update({ pr_seats: 0, updated_at: new Date().toISOString() })
    .gte("id", 0);

  if (resetErr) {
    console.error("❌ Failed to reset PR seats:", resetErr.message);
  }

  // Apply new seat allocations
  let totalSeatsAllocated = 0;
  console.log("🪑 PR Seat Allocation:\n");
  const seatEntries = Object.entries(seatMap).sort(
    (a, b) => b[1].seats - a[1].seats
  );

  for (const [dbId, info] of seatEntries) {
    const { error: seatErr } = await supabase
      .from("parties")
      .update({ pr_seats: info.seats, updated_at: new Date().toISOString() })
      .eq("id", Number(dbId));

    if (seatErr) {
      console.log(`   ❌ Failed to set PR seats for ${info.name}: ${seatErr.message}`);
    } else {
      console.log(`   ${info.name}: ${info.seats} seats`);
      totalSeatsAllocated += info.seats;
    }
  }

  console.log(`\n   Total PR seats allocated: ${totalSeatsAllocated} / ${PR_SEATS}`);

  // Step 4: Verify — fetch top 15 parties
  console.log("\n📋 Verification — Top 15 parties by PR votes:\n");
  const { data: topParties, error: verifyErr } = await supabase
    .from("parties")
    .select("name_en, name_ne, pr_votes, pr_seats, ec_symbol_id, total_seats")
    .order("pr_votes", { ascending: false })
    .limit(15);

  if (verifyErr) {
    console.error("❌ Verification failed:", verifyErr.message);
  } else {
    console.log(
      "   " +
        "Party".padEnd(40) +
        "PR Votes".padStart(12) +
        "PR Seats".padStart(10) +
        "Total".padStart(8) +
        "  SymbolID"
    );
    console.log("   " + "─".repeat(80));
    for (const p of topParties) {
      const name = (p.name_en || "").slice(0, 38);
      console.log(
        `   ${name.padEnd(40)}${(p.pr_votes || 0).toLocaleString().padStart(12)}${(p.pr_seats || 0).toString().padStart(10)}${(p.total_seats || 0).toString().padStart(8)}  ${p.ec_symbol_id || "—"}`
      );
    }
  }

  // Verify totals
  const { data: totals } = await supabase
    .from("parties")
    .select("pr_votes, pr_seats");

  if (totals) {
    const sumVotes = totals.reduce((s, p) => s + (p.pr_votes || 0), 0);
    const sumSeats = totals.reduce((s, p) => s + (p.pr_seats || 0), 0);
    console.log(`\n✅ Total PR votes in DB: ${sumVotes.toLocaleString()}`);
    console.log(`✅ Total PR seats in DB: ${sumSeats}`);
    const expectedVotes = EC_PR_DATA.reduce((s, p) => s + p.prVotes, 0);
    console.log(`✅ Expected PR votes: ${expectedVotes.toLocaleString()}`);
    if (sumSeats !== PR_SEATS) {
      console.warn(`⚠️  Seat total mismatch! Expected ${PR_SEATS}, got ${sumSeats}`);
    }
  }

  console.log("\n🎉 Done!");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
