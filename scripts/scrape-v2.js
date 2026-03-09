/**
 * Enhanced Election Commission scraper.
 * Parses both FPTP and PR vote data from the EC website and writes to Supabase.
 * Falls back to writing data.json for static deployment compatibility.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/scrape-v2.js
 *
 * Without Supabase env vars, writes to frontend/public/data.json (legacy mode).
 */

const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

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
  // Supabase not available — legacy JSON mode
}

const EC_FPTP_URL =
  "https://result.election.gov.np/PRVoteChartResult2082.aspx";
const EC_PR_URL =
  "https://result.election.gov.np/PRVoteChartResult2082.aspx"; // same page, PR tab
const DATA_PATH = path.join(__dirname, "../frontend/public/data.json");

const PARTY_COLORS = {
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
  Independent: { nameNp: "स्वतन्त्र", shortName: "Ind", color: "#6B7280" },
};

function normalisePartyName(raw) {
  const s = (raw || "").trim();
  if (/nepali congress/i.test(s)) return "Nepali Congress";
  if (/uml|एमाले|माले/i.test(s) || /cpn.uml/i.test(s)) return "CPN-UML";
  if (/maoist/i.test(s) || /माओवादी/i.test(s)) return "CPN-Maoist Centre";
  if (/rsp|rastriya swatantra/i.test(s) || /राष्ट्रिय स्वतन्त्र/i.test(s))
    return "RSP";
  if (/rpp|rastriya prajatantra/i.test(s) || /राप्रपा/i.test(s)) return "RPP";
  if (/janata samajbadi/i.test(s) || /जनता समाजवादी/i.test(s))
    return "Janata Samajbadi";
  if (/janamat/i.test(s) || /जनमत/i.test(s)) return "Janamat Party";
  if (/loktantrik samajbadi/i.test(s) || /लोकतान्त्रिक समाजवादी/i.test(s))
    return "Loktantrik Samajbadi";
  if (/nagarik unmukti/i.test(s) || /नागरिक उन्मुक्ति/i.test(s))
    return "Nagarik Unmukti";
  if (/independent|स्वतन्त्र/i.test(s)) return "Independent";
  return s;
}

function getPartyInfo(name) {
  return (
    PARTY_COLORS[name] || {
      nameNp: name,
      shortName: name.slice(0, 4).toUpperCase(),
      color: "#6B7280",
    }
  );
}

function parseNumber(str) {
  const n = parseInt((str || "").replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NepalElectionBot/2.0; +https://github.com/ashimpaudel/nepal-election-live)",
      Accept: "text/html,application/xhtml+xml",
    },
    timeout: 30000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function parseElectionData(html) {
  const $ = cheerio.load(html);
  const partyMap = {};
  const constituencies = [];
  let constId = 1;

  // Parse party summary table
  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;
    const first = $(cells[0]).text().trim();
    if (!first) return;

    const partyName = normalisePartyName(first);
    const info = getPartyInfo(partyName);
    const nums = [];
    cells.each((__, td) => {
      const n = parseNumber($(td).text());
      if (n > 0) nums.push(n);
    });
    if (nums.length === 0) return;

    if (!partyMap[partyName]) {
      partyMap[partyName] = {
        won: 0,
        leading: 0,
        totalVotes: 0,
        prVotes: 0,
        info,
      };
    }

    if (nums.length >= 3) {
      partyMap[partyName].won = Math.max(partyMap[partyName].won, nums[0]);
      partyMap[partyName].leading = Math.max(
        partyMap[partyName].leading,
        nums[1]
      );
      partyMap[partyName].totalVotes = Math.max(
        partyMap[partyName].totalVotes,
        nums[nums.length - 1]
      );
    } else if (nums.length === 2) {
      partyMap[partyName].won = Math.max(partyMap[partyName].won, nums[0]);
      partyMap[partyName].leading = Math.max(
        partyMap[partyName].leading,
        nums[1]
      );
    } else {
      partyMap[partyName].won = Math.max(partyMap[partyName].won, nums[0]);
    }
  });

  // Parse constituency results
  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    if (rows.length < 2) return;

    const headerText = $(rows[0]).text().toLowerCase();
    const isConstTable =
      /candidate|party|votes|naam|नाम|दल/.test(headerText) ||
      (rows.length >= 3 && $(rows[1]).find("td").length >= 3);
    if (!isConstTable) return;

    let constName = $(table).find("caption").text().trim();
    if (!constName) {
      const prev = $(table).prev();
      constName = prev.text().trim().split("\n")[0].trim();
    }
    if (!constName) constName = `Constituency ${constId}`;

    const candidates = [];
    rows.each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find("td");
      if (cells.length < 3) return;

      const candidateName = $(cells[0]).text().trim();
      const rawParty = $(cells[1]).text().trim();
      const votes = parseNumber($(cells[cells.length - 1]).text());
      if (!candidateName || votes === 0) return;

      const partyName = normalisePartyName(rawParty || "Independent");
      const info = getPartyInfo(partyName);

      candidates.push({
        name: candidateName,
        party: partyName,
        partyShort: info.shortName,
        votes,
        color: info.color,
      });

      if (!partyMap[partyName]) {
        partyMap[partyName] = {
          won: 0,
          leading: 0,
          totalVotes: 0,
          prVotes: 0,
          info,
        };
      }
      partyMap[partyName].totalVotes += votes;
    });

    if (candidates.length === 0) return;
    candidates.sort((a, b) => b.votes - a.votes);

    const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);
    constituencies.push({
      id: constId++,
      name: constName,
      province: "",
      status: "declared",
      totalVotes,
      candidates,
    });
  });

  return { partyMap, constituencies };
}

async function writeToSupabase(partyMap, constituencies) {
  if (!supabase) return false;

  let recordsUpdated = 0;

  // Update party data
  for (const [name, stats] of Object.entries(partyMap)) {
    const { error } = await supabase
      .from("parties")
      .update({
        fptp_won: stats.won,
        fptp_leading: stats.leading,
        pr_votes: stats.prVotes || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("name_en", name);

    if (!error) recordsUpdated++;
  }

  // Log the scrape
  await supabase.from("scrape_log").insert({
    source: EC_FPTP_URL,
    status: "success",
    records_updated: recordsUpdated,
  });

  console.log(`📊 Updated ${recordsUpdated} party records in Supabase`);
  return true;
}

function writeToJSON(partyMap, constituencies) {
  const allPartyNames = new Set([
    ...Object.keys(PARTY_COLORS),
    ...Object.keys(partyMap),
  ]);

  const parties = [];
  for (const name of allPartyNames) {
    const info = getPartyInfo(name);
    const stats = partyMap[name] || {
      won: 0,
      leading: 0,
      totalVotes: 0,
      prVotes: 0,
    };
    if (
      stats.won === 0 &&
      stats.leading === 0 &&
      stats.totalVotes === 0 &&
      !PARTY_COLORS[name]
    )
      continue;

    parties.push({
      name,
      nameNp: info.nameNp,
      shortName: info.shortName,
      color: info.color,
      won: stats.won,
      leading: stats.leading,
      totalVotes: stats.totalVotes,
      prVotes: stats.prVotes || 0,
    });
  }

  parties.sort((a, b) => b.won + b.leading - (a.won + a.leading));

  const totalSeats = 275; // Updated: 165 FPTP + 110 PR
  const declared = constituencies.filter((c) => c.status === "declared").length;
  const counting = constituencies.filter((c) => c.status === "counting").length;
  const pending = Math.max(0, 165 - declared - counting);
  const totalVotesCast = constituencies.reduce(
    (s, c) => s + c.totalVotes,
    0
  );

  const output = {
    lastUpdated: new Date().toISOString(),
    totalSeats,
    fptpSeats: 165,
    prSeats: 110,
    parties,
    constituencies,
    summary: {
      totalSeats,
      fptpSeats: 165,
      prSeats: 110,
      declared,
      counting,
      pending,
      totalVotesCast,
    },
  };

  fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `✅ data.json written — ${parties.length} parties, ${constituencies.length} constituencies`
  );
}

async function scrape() {
  console.log("🔍 Fetching Election Commission page…");

  let html;
  try {
    html = await fetchPage(EC_FPTP_URL);
  } catch (err) {
    console.error("Failed to fetch EC page:", err.message);

    if (supabase) {
      await supabase.from("scrape_log").insert({
        source: EC_FPTP_URL,
        status: "error",
        error_message: err.message,
      });
    }

    console.log("Keeping existing data unchanged.");
    process.exit(0);
  }

  console.log("📋 Parsing HTML…");
  const { partyMap, constituencies } = parseElectionData(html);

  // Write to Supabase if available
  const wroteToSupabase = await writeToSupabase(partyMap, constituencies);

  // Always write to JSON as fallback / for static deployment
  writeToJSON(partyMap, constituencies);

  if (wroteToSupabase) {
    console.log("🎉 Data written to both Supabase and data.json");
  } else {
    console.log("📁 Data written to data.json only (no Supabase configured)");
  }
}

scrape().catch((err) => {
  console.error("Unexpected scraper error:", err);
  process.exit(1);
});
