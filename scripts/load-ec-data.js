/**
 * Load real Nepal Election Commission FPTP results into Supabase.
 * 164/165 constituencies declared.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/load-ec-data.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://lorrugedmqbjrxodxgdh.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvcnJ1Z2VkbXFianJ4b2R4Z2RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzE2NywiZXhwIjoyMDg4NjUzMTY3fQ.GdD4B907alQ4sMWZtfWA6UqyS4JSW9PhiUjVvHYsS7U";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Real EC FPTP results (164/165 declared)
const fptpResults = [
  { name_en: "RSP", fptp_won: 125, fptp_leading: 0 },
  { name_en: "Nepali Congress", fptp_won: 18, fptp_leading: 0 },
  { name_en: "CPN-UML", fptp_won: 9, fptp_leading: 0 },
  { name_en: "CPN-Maoist Centre", fptp_won: 7, fptp_leading: 0 },
  { name_en: "RPP", fptp_won: 1, fptp_leading: 0 },
  { name_en: "Independent", fptp_won: 1, fptp_leading: 0 },
];

// New party not yet in DB
const newParty = {
  name_en: "Shram Sanskriti Party",
  name_ne: "श्रम संस्कृति पार्टी",
  short_name: "SSP",
  color: "#059669",
  fptp_won: 3,
  fptp_leading: 0,
};

async function updatePartyResults() {
  // 1. Insert the new party
  console.log("➕ Inserting new party: Shram Sanskriti Party...");
  const { error: insertErr } = await supabase
    .from("parties")
    .upsert(newParty, { onConflict: "name_en" });
  if (insertErr) throw new Error(`Insert SSP failed: ${insertErr.message}`);
  console.log("✅ Shram Sanskriti Party inserted");

  // 2. Update existing parties
  for (const party of fptpResults) {
    console.log(`📝 Updating ${party.name_en}: won=${party.fptp_won}`);
    const { error } = await supabase
      .from("parties")
      .update({ fptp_won: party.fptp_won, fptp_leading: party.fptp_leading })
      .eq("name_en", party.name_en);
    if (error)
      throw new Error(`Update ${party.name_en} failed: ${error.message}`);
  }

  // Reset parties with 0 wins that aren't in results
  const partyNames = [
    ...fptpResults.map((p) => p.name_en),
    newParty.name_en,
  ];
  const { error: resetErr } = await supabase
    .from("parties")
    .update({ fptp_won: 0, fptp_leading: 0 })
    .not("name_en", "in", `(${partyNames.join(",")})`);
  if (resetErr) console.warn("⚠️  Reset other parties warning:", resetErr.message);

  console.log("✅ All party FPTP results updated");
}

async function updateConstituencies() {
  // Fetch all constituencies ordered by id
  const { data: constituencies, error: fetchErr } = await supabase
    .from("constituencies")
    .select("id")
    .order("id", { ascending: true });
  if (fetchErr) throw new Error(`Fetch constituencies failed: ${fetchErr.message}`);

  const total = constituencies.length;
  console.log(`\n📊 Found ${total} constituencies`);

  if (total === 0) {
    console.log("⚠️  No constituencies in DB — skipping status update");
    return;
  }

  // Set 164 as 'declared', last 1 as 'counting'
  const declaredIds = constituencies.slice(0, 164).map((c) => c.id);
  const countingIds = constituencies.slice(164).map((c) => c.id);

  // Batch update declared
  const { error: declErr } = await supabase
    .from("constituencies")
    .update({ status: "declared" })
    .in("id", declaredIds);
  if (declErr) throw new Error(`Declared update failed: ${declErr.message}`);
  console.log(`✅ Set ${declaredIds.length} constituencies to 'declared'`);

  if (countingIds.length > 0) {
    const { error: countErr } = await supabase
      .from("constituencies")
      .update({ status: "counting" })
      .in("id", countingIds);
    if (countErr) throw new Error(`Counting update failed: ${countErr.message}`);
    console.log(`✅ Set ${countingIds.length} constituency to 'counting'`);
  }
}

async function updateDataJson() {
  const dataPath = path.join(__dirname, "../frontend/public/data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // Fetch fresh party data from DB
  const { data: parties, error } = await supabase
    .from("parties")
    .select("name_en, name_ne, short_name, color, fptp_won, fptp_leading")
    .order("fptp_won", { ascending: false });
  if (error) throw new Error(`Fetch parties for JSON failed: ${error.message}`);

  data.lastUpdated = new Date().toISOString();
  data.parties = parties.map((p) => ({
    name: p.name_en,
    nameNp: p.name_ne,
    shortName: p.short_name,
    color: p.color,
    won: p.fptp_won,
    leading: p.fptp_leading,
    totalVotes: 0,
    prVotes: 0,
  }));

  data.summary = {
    ...data.summary,
    declared: 164,
    counting: 1,
    pending: 0,
    totalSeats: 275,
    fptpSeats: 165,
    prSeats: 110,
  };

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log("\n✅ Updated frontend/public/data.json");
}

async function verifyResults() {
  console.log("\n🔍 Verifying party data...");
  const { data: parties, error } = await supabase
    .from("parties")
    .select("name_en, short_name, fptp_won, fptp_leading, total_seats")
    .order("fptp_won", { ascending: false });
  if (error) throw new Error(`Verify failed: ${error.message}`);

  console.log("\n" + "=".repeat(60));
  console.log("Party".padEnd(25) + "Won".padStart(6) + "Leading".padStart(10) + "Total".padStart(8));
  console.log("-".repeat(60));
  let totalWon = 0;
  for (const p of parties) {
    totalWon += p.fptp_won;
    console.log(
      p.name_en.padEnd(25) +
        String(p.fptp_won).padStart(6) +
        String(p.fptp_leading).padStart(10) +
        String(p.total_seats).padStart(8)
    );
  }
  console.log("-".repeat(60));
  console.log("Total FPTP Won:".padEnd(25) + String(totalWon).padStart(6));
  console.log("=".repeat(60));
}

async function main() {
  console.log("🗳️  Loading Nepal EC FPTP Results into Supabase...\n");

  await updatePartyResults();
  await updateConstituencies();
  await updateDataJson();
  await verifyResults();

  console.log("\n🎉 EC data load complete!");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
