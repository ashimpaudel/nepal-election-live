/**
 * Database seeder — reads CSV seed files and inserts reference data into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-db.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const [headerLine, ...rows] = content.split("\n");
  const headers = headerLine.split(",");
  return rows.map((row) => {
    const values = row.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim() ?? "";
    });
    return obj;
  });
}

async function seedProvinces() {
  const csvPath = path.join(
    __dirname,
    "../frontend/src/data/seed/provinces.csv"
  );
  const rows = parseCSV(csvPath);
  const data = rows.map((r) => ({
    id: parseInt(r.id),
    code: r.code,
    name_en: r.name_en,
    name_ne: r.name_ne,
  }));

  const { error } = await supabase.from("provinces").upsert(data);
  if (error) throw new Error(`Provinces seed failed: ${error.message}`);
  console.log(`✅ Seeded ${data.length} provinces`);
}

async function seedDistricts() {
  const csvPath = path.join(
    __dirname,
    "../frontend/src/data/seed/districts.csv"
  );
  const rows = parseCSV(csvPath);
  const data = rows.map((r) => ({
    id: parseInt(r.id),
    province_id: parseInt(r.province_id),
    code: r.code,
    name_en: r.name_en,
    name_ne: r.name_ne,
  }));

  const { error } = await supabase.from("districts").upsert(data);
  if (error) throw new Error(`Districts seed failed: ${error.message}`);
  console.log(`✅ Seeded ${data.length} districts`);
}

async function seedConstituencies() {
  const csvPath = path.join(
    __dirname,
    "../frontend/src/data/seed/constituencies.csv"
  );
  const rows = parseCSV(csvPath);

  // We need to look up district IDs by code
  const { data: districts, error: dErr } = await supabase
    .from("districts")
    .select("id, code");
  if (dErr) throw new Error(`Failed to fetch districts: ${dErr.message}`);

  const districtMap = {};
  for (const d of districts) {
    districtMap[d.code] = d.id;
  }

  const data = rows.map((r) => ({
    id: parseInt(r.id),
    district_id: districtMap[r.district_code],
    number: parseInt(r.number),
    name_en: r.name_en,
    name_ne: r.name_ne,
    status: "pending",
  }));

  // Filter out any with undefined district_id
  const valid = data.filter((d) => d.district_id);
  const invalid = data.filter((d) => !d.district_id);
  if (invalid.length > 0) {
    console.warn(
      `⚠️  ${invalid.length} constituencies have unknown district codes:`,
      invalid.map((d) => d.name_en)
    );
  }

  const { error } = await supabase.from("constituencies").upsert(valid);
  if (error) throw new Error(`Constituencies seed failed: ${error.message}`);
  console.log(`✅ Seeded ${valid.length} constituencies`);
}

async function seedParties() {
  const parties = [
    {
      name_en: "Nepali Congress",
      name_ne: "नेपाली कांग्रेस",
      short_name: "NC",
      color: "#E11D48",
    },
    {
      name_en: "CPN-UML",
      name_ne: "नेकपा एमाले",
      short_name: "UML",
      color: "#2563EB",
    },
    {
      name_en: "CPN-Maoist Centre",
      name_ne: "नेकपा माओवादी केन्द्र",
      short_name: "MC",
      color: "#DC2626",
    },
    {
      name_en: "RSP",
      name_ne: "राष्ट्रिय स्वतन्त्र पार्टी",
      short_name: "RSP",
      color: "#F59E0B",
    },
    {
      name_en: "RPP",
      name_ne: "राप्रपा",
      short_name: "RPP",
      color: "#8B5CF6",
    },
    {
      name_en: "Janata Samajbadi",
      name_ne: "जनता समाजवादी पार्टी",
      short_name: "JSP",
      color: "#10B981",
    },
    {
      name_en: "Janamat Party",
      name_ne: "जनमत पार्टी",
      short_name: "JP",
      color: "#F97316",
    },
    {
      name_en: "Loktantrik Samajbadi",
      name_ne: "लोकतान्त्रिक समाजवादी",
      short_name: "LSP",
      color: "#6366F1",
    },
    {
      name_en: "Nagarik Unmukti",
      name_ne: "नागरिक उन्मुक्ति पार्टी",
      short_name: "NUP",
      color: "#14B8A6",
    },
    {
      name_en: "Independent",
      name_ne: "स्वतन्त्र",
      short_name: "Ind",
      color: "#6B7280",
    },
    {
      name_en: "Shram Sanskriti Party",
      name_ne: "श्रम संस्कृति पार्टी",
      short_name: "SSP",
      color: "#059669",
    },
  ];

  const { error } = await supabase.from("parties").upsert(parties, {
    onConflict: "name_en",
  });
  if (error) throw new Error(`Parties seed failed: ${error.message}`);
  console.log(`✅ Seeded ${parties.length} parties`);
}

async function seedPAConstituencies() {
  // PA FPTP seat counts per province
  const PA_SEATS = {
    1: 56, // Koshi
    2: 64, // Madhesh
    3: 66, // Bagmati
    4: 36, // Gandaki
    5: 52, // Lumbini
    6: 24, // Karnali
    7: 32, // Sudurpashchim
  };

  // Fetch all districts grouped by province
  const { data: districts, error: dErr } = await supabase
    .from("districts")
    .select("id, province_id, name_en, name_ne")
    .order("id");
  if (dErr) throw new Error(`Failed to fetch districts: ${dErr.message}`);

  const districtsByProvince = {};
  for (const d of districts) {
    if (!districtsByProvince[d.province_id]) {
      districtsByProvince[d.province_id] = [];
    }
    districtsByProvince[d.province_id].push(d);
  }

  const records = [];

  for (const [provinceId, totalSeats] of Object.entries(PA_SEATS)) {
    const provDistricts = districtsByProvince[provinceId] || [];
    if (provDistricts.length === 0) {
      console.warn(`⚠️  No districts found for province ${provinceId}`);
      continue;
    }

    // Distribute seats proportionally across districts (round-robin for remainder)
    const basePerDistrict = Math.floor(totalSeats / provDistricts.length);
    let remainder = totalSeats - basePerDistrict * provDistricts.length;
    const seatsPerDistrict = provDistricts.map(() => {
      const extra = remainder > 0 ? 1 : 0;
      remainder--;
      return basePerDistrict + extra;
    });

    for (let di = 0; di < provDistricts.length; di++) {
      const district = provDistricts[di];
      const districtSeats = seatsPerDistrict[di];
      for (let n = 1; n <= districtSeats; n++) {
        records.push({
          province_id: parseInt(provinceId),
          district_id: district.id,
          number: n,
          name_en: `${district.name_en}-PA-${n}`,
          name_ne: `${district.name_ne}-PA-${n}`,
          status: "pending",
        });
      }
    }
  }

  // Upsert in batches to avoid payload limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("pa_constituencies").upsert(batch);
    if (error)
      throw new Error(`PA constituencies seed failed: ${error.message}`);
  }

  console.log(`✅ Seeded ${records.length} PA constituencies`);
}

async function main() {
  console.log("🌱 Seeding database...\n");
  await seedProvinces();
  await seedDistricts();
  await seedConstituencies();
  await seedParties();
  await seedPAConstituencies();
  console.log("\n🎉 Seeding complete!");
}

main().catch((err) => {
  console.error("❌ Seed error:", err.message);
  process.exit(1);
});
