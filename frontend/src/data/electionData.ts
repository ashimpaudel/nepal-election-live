export interface Party {
  name: string;
  nameNp: string;
  shortName: string;
  color: string;
  won: number;
  leading: number;
  totalVotes: number;
}

export interface Candidate {
  name: string;
  party: string;
  partyShort: string;
  votes: number;
  color: string;
}

export interface Constituency {
  id: number;
  name: string;
  province: string;
  status: "declared" | "counting" | "pending";
  totalVotes: number;
  candidates: Candidate[];
}

export interface ElectionSummary {
  totalSeats: number;
  declared: number;
  counting: number;
  pending: number;
  totalVotesCast: number;
  lastUpdated: Date;
}

const PARTIES: Record<string, { nameNp: string; color: string }> = {
  "Nepali Congress": { nameNp: "नेपाली कांग्रेस", color: "#E11D48" },
  "CPN-UML": { nameNp: "नेकपा एमाले", color: "#2563EB" },
  "CPN-Maoist Centre": { nameNp: "नेकपा माओवादी केन्द्र", color: "#DC2626" },
  RSP: { nameNp: "राष्ट्रिय स्वतन्त्र पार्टी", color: "#F59E0B" },
  RPP: { nameNp: "राप्रपा", color: "#8B5CF6" },
  "Janata Samajbadi": { nameNp: "जनता समाजवादी पार्टी", color: "#10B981" },
  "Janamat Party": { nameNp: "जनमत पार्टी", color: "#F97316" },
  "Loktantrik Samajbadi": {
    nameNp: "लोकतान्त्रिक समाजवादी",
    color: "#6366F1",
  },
  "Nagarik Unmukti": { nameNp: "नागरिक उन्मुक्ति पार्टी", color: "#14B8A6" },
  Independent: { nameNp: "स्वतन्त्र", color: "#6B7280" },
};

const PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
];

const CONSTITUENCY_NAMES: Record<string, string[]> = {
  Koshi: [
    "Jhapa-1",
    "Jhapa-2",
    "Jhapa-3",
    "Jhapa-4",
    "Morang-1",
    "Morang-2",
    "Morang-3",
    "Morang-4",
    "Morang-5",
    "Morang-6",
    "Sunsari-1",
    "Sunsari-2",
    "Sunsari-3",
    "Ilam-1",
    "Ilam-2",
  ],
  Madhesh: [
    "Siraha-1",
    "Siraha-2",
    "Siraha-3",
    "Siraha-4",
    "Saptari-1",
    "Saptari-2",
    "Saptari-3",
    "Dhanusha-1",
    "Dhanusha-2",
    "Dhanusha-3",
    "Dhanusha-4",
    "Mahottari-1",
    "Mahottari-2",
    "Mahottari-3",
  ],
  Bagmati: [
    "Kathmandu-1",
    "Kathmandu-2",
    "Kathmandu-3",
    "Kathmandu-4",
    "Kathmandu-5",
    "Kathmandu-6",
    "Kathmandu-7",
    "Kathmandu-8",
    "Kathmandu-9",
    "Kathmandu-10",
    "Lalitpur-1",
    "Lalitpur-2",
    "Lalitpur-3",
    "Bhaktapur-1",
    "Bhaktapur-2",
  ],
  Gandaki: [
    "Kaski-1",
    "Kaski-2",
    "Tanahun-1",
    "Tanahun-2",
    "Gorkha-1",
    "Gorkha-2",
    "Lamjung-1",
    "Syangja-1",
    "Syangja-2",
    "Parbat-1",
  ],
  Lumbini: [
    "Rupandehi-1",
    "Rupandehi-2",
    "Rupandehi-3",
    "Rupandehi-4",
    "Kapilvastu-1",
    "Kapilvastu-2",
    "Kapilvastu-3",
    "Dang-1",
    "Dang-2",
    "Dang-3",
    "Banke-1",
    "Banke-2",
  ],
  Karnali: [
    "Surkhet-1",
    "Surkhet-2",
    "Dailekh-1",
    "Dailekh-2",
    "Jajarkot-1",
    "Jumla-1",
    "Kalikot-1",
  ],
  Sudurpashchim: [
    "Kailali-1",
    "Kailali-2",
    "Kailali-3",
    "Kailali-4",
    "Kanchanpur-1",
    "Kanchanpur-2",
    "Dadeldhura-1",
    "Baitadi-1",
    "Baitadi-2",
  ],
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateConstituencies(): Constituency[] {
  const random = seededRandom(2082);
  const partyNames = Object.keys(PARTIES);
  const constituencies: Constituency[] = [];
  let id = 1;

  for (const province of PROVINCES) {
    const names = CONSTITUENCY_NAMES[province] || [];
    for (const name of names) {
      const r = random();
      const status: Constituency["status"] =
        r < 0.55 ? "declared" : r < 0.8 ? "counting" : "pending";

      const numCandidates = 3 + Math.floor(random() * 4);
      const candidates: Candidate[] = [];

      const shuffled = [...partyNames].sort(() => random() - 0.5);
      const selected = shuffled.slice(0, numCandidates);

      let remainingVotes =
        status === "pending" ? 0 : 20000 + Math.floor(random() * 40000);

      for (let i = 0; i < selected.length; i++) {
        const partyName = selected[i];
        const info = PARTIES[partyName];
        const share =
          i === 0
            ? 0.3 + random() * 0.25
            : i === 1
              ? 0.15 + random() * 0.15
              : random() * 0.1 + 0.02;

        const votes =
          status === "pending"
            ? 0
            : i === selected.length - 1
              ? remainingVotes
              : Math.floor(remainingVotes * share);

        if (i < selected.length - 1) {
          remainingVotes -= votes;
        }

        candidates.push({
          name: `Candidate ${id}-${i + 1}`,
          party: partyName,
          partyShort:
            partyName === "Nepali Congress"
              ? "NC"
              : partyName === "CPN-UML"
                ? "UML"
                : partyName === "CPN-Maoist Centre"
                  ? "MC"
                  : partyName === "Janata Samajbadi"
                    ? "JSP"
                    : partyName === "Loktantrik Samajbadi"
                      ? "LSP"
                      : partyName === "Nagarik Unmukti"
                        ? "NUP"
                        : partyName,
          votes,
          color: info.color,
        });
      }

      candidates.sort((a, b) => b.votes - a.votes);

      constituencies.push({
        id: id++,
        name,
        province,
        status,
        totalVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
        candidates,
      });
    }
  }

  return constituencies;
}

export function getElectionData(): {
  parties: Party[];
  constituencies: Constituency[];
  summary: ElectionSummary;
} {
  const constituencies = generateConstituencies();

  const partyStats: Record<
    string,
    { won: number; leading: number; totalVotes: number }
  > = {};
  for (const name of Object.keys(PARTIES)) {
    partyStats[name] = { won: 0, leading: 0, totalVotes: 0 };
  }

  for (const c of constituencies) {
    if (c.candidates.length === 0) continue;

    for (const cand of c.candidates) {
      if (partyStats[cand.party]) {
        partyStats[cand.party].totalVotes += cand.votes;
      }
    }

    const winner = c.candidates[0];
    if (c.status === "declared" && partyStats[winner.party]) {
      partyStats[winner.party].won++;
    } else if (c.status === "counting" && partyStats[winner.party]) {
      partyStats[winner.party].leading++;
    }
  }

  const parties: Party[] = Object.entries(PARTIES)
    .map(([name, info]) => ({
      name,
      nameNp: info.nameNp,
      shortName:
        name === "Nepali Congress"
          ? "NC"
          : name === "CPN-UML"
            ? "UML"
            : name === "CPN-Maoist Centre"
              ? "MC"
              : name === "Janata Samajbadi"
                ? "JSP"
                : name === "Loktantrik Samajbadi"
                  ? "LSP"
                  : name === "Nagarik Unmukti"
                    ? "NUP"
                    : name,
      color: info.color,
      won: partyStats[name].won,
      leading: partyStats[name].leading,
      totalVotes: partyStats[name].totalVotes,
    }))
    .sort((a, b) => b.won + b.leading - (a.won + a.leading));

  const declared = constituencies.filter((c) => c.status === "declared").length;
  const counting = constituencies.filter((c) => c.status === "counting").length;
  const pending = constituencies.filter((c) => c.status === "pending").length;

  return {
    parties,
    constituencies,
    summary: {
      totalSeats: constituencies.length,
      declared,
      counting,
      pending,
      totalVotesCast: constituencies.reduce((s, c) => s + c.totalVotes, 0),
      lastUpdated: new Date(),
    },
  };
}
