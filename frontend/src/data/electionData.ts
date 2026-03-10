export interface Party {
  name: string;
  nameNp: string;
  shortName: string;
  color: string;
  won: number;        // FPTP won
  leading: number;    // FPTP leading
  totalVotes: number; // PR votes
  prSeats: number;    // PR seats allocated
  totalSeats: number; // won + prSeats (the REAL total)
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
  lastUpdated: Date | null;
}
