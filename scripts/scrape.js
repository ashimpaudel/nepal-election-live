const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const EC_URL =
  "https://result.election.gov.np/PRVoteChartResult2082.aspx";

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

/** Normalise a party name string from the EC website to our canonical names */
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
  return s; // unknown party — use raw name
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

async function scrape() {
  console.log("Fetching Election Commission page…");

  let html;
  try {
    const res = await fetch(EC_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NepalElectionBot/1.0; +https://github.com/ashimpaudel/nepal-election-live)",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 30000,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    html = await res.text();
  } catch (err) {
    console.error("Failed to fetch EC page:", err.message);
    console.log("Keeping existing data.json unchanged.");
    process.exit(0);
  }

  console.log("Parsing HTML…");
  const $ = cheerio.load(html);

  // ── 1. Party summary table ──────────────────────────────────────────────────
  // The EC page typically has a table listing parties, seats won, leading, votes.
  // We try several common selectors and fall back gracefully.
  const partyMap = {}; // canonical name → { won, leading, totalVotes }

  // Look for any table rows that contain party data
  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const first = $(cells[0]).text().trim();
    if (!first) return;

    const partyName = normalisePartyName(first);
    const info = getPartyInfo(partyName);

    // Try to find won / leading / votes columns heuristically
    const nums = [];
    cells.each((__, td) => {
      const n = parseNumber($(td).text());
      if (n > 0) nums.push(n);
    });

    if (nums.length === 0) return;

    if (!partyMap[partyName]) {
      partyMap[partyName] = { won: 0, leading: 0, totalVotes: 0, info };
    }

    // If we get 3+ numbers: typically [won, leading, votes] or [won, leading, total, votes]
    // If we get 2: [won, leading] or [seats, votes]
    // If we get 1: just seats or votes
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

  // ── 2. Constituency results ────────────────────────────────────────────────
  const constituencies = [];
  let constId = 1;

  // The EC page may embed constituency data in multiple ways — try to find them
  // by looking for repeated structural patterns (e.g. divs or table sections
  // with candidate vote tallies).
  $("table").each((_, table) => {
    // Skip the main party summary table (already processed above)
    const rows = $(table).find("tr");
    if (rows.length < 2) return;

    // Detect if this looks like a constituency result table:
    // headers might contain "Candidate", "Party", "Votes" etc.
    const headerText = $(rows[0]).text().toLowerCase();
    const isConstTable =
      /candidate|party|votes|naam|नाम|दल/.test(headerText) ||
      (rows.length >= 3 && $(rows[1]).find("td").length >= 3);

    if (!isConstTable) return;

    // Extract constituency name from the nearest preceding heading/caption
    let constName = $(table).find("caption").text().trim();
    if (!constName) {
      // Try the immediately preceding h2/h3/h4/p/div
      const prev = $(table).prev();
      constName = prev.text().trim().split("\n")[0].trim();
    }
    if (!constName) {
      constName = `Constituency ${constId}`;
    }

    const candidates = [];
    rows.each((i, row) => {
      if (i === 0) return; // skip header row
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

      // Also update partyMap totals
      if (!partyMap[partyName]) {
        partyMap[partyName] = { won: 0, leading: 0, totalVotes: 0, info };
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

  // ── 3. Build parties array ──────────────────────────────────────────────────
  // Merge known parties + any discovered from the page
  const allPartyNames = new Set([
    ...Object.keys(PARTY_COLORS),
    ...Object.keys(partyMap),
  ]);

  const parties = [];
  for (const name of allPartyNames) {
    const info = getPartyInfo(name);
    const stats = partyMap[name] || { won: 0, leading: 0, totalVotes: 0 };
    if (stats.won === 0 && stats.leading === 0 && stats.totalVotes === 0) {
      // Skip unknown parties that have no data; always include known parties
      if (!PARTY_COLORS[name]) continue;
    }
    parties.push({
      name,
      nameNp: info.nameNp,
      shortName: info.shortName,
      color: info.color,
      won: stats.won,
      leading: stats.leading,
      totalVotes: stats.totalVotes,
    });
  }

  parties.sort((a, b) => b.won + b.leading - (a.won + a.leading));

  // ── 4. Summary ─────────────────────────────────────────────────────────────
  const totalSeats = 165;
  const declared = constituencies.filter((c) => c.status === "declared").length;
  const counting = constituencies.filter((c) => c.status === "counting").length;
  const pending = Math.max(0, totalSeats - declared - counting);
  const totalVotesCast = constituencies.reduce((s, c) => s + c.totalVotes, 0);

  const output = {
    lastUpdated: new Date().toISOString(),
    totalSeats,
    parties,
    constituencies,
    summary: {
      totalSeats,
      declared,
      counting,
      pending,
      totalVotesCast,
    },
  };

  // ── 5. Write to disk ────────────────────────────────────────────────────────
  fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `✅ data.json written — ${parties.length} parties, ${constituencies.length} constituencies`
  );
}

scrape().catch((err) => {
  console.error("Unexpected scraper error:", err);
  process.exit(1);
});
