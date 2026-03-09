/**
 * Seed translations into Supabase from the translations.json file.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-translations.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  const translations = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../frontend/src/data/seed/translations.json"),
      "utf-8"
    )
  );

  const rows = [];
  for (const [key, locales] of Object.entries(translations)) {
    for (const [locale, value] of Object.entries(locales)) {
      rows.push({ key, locale, value });
    }
  }

  console.log(`📝 Seeding ${rows.length} translations...`);

  // Batch upsert in chunks of 100
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase
      .from("translations")
      .upsert(chunk, { onConflict: "key,locale" });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
  }

  console.log(
    `✅ Seeded ${rows.length} translations (${Object.keys(translations).length} keys × 7 locales)`
  );
}

seed().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
