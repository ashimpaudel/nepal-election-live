// ============================================================
// Shared TypeScript types for the Nepal Election dashboard
// Aligned with the Supabase database schema
// ============================================================

export interface Province {
  id: number;
  code: string;
  name_en: string;
  name_ne: string;
  name_mai?: string;
  name_bho?: string;
  name_thr?: string;
  name_tam?: string;
  name_new?: string;
}

export interface District {
  id: number;
  province_id: number;
  code: string;
  name_en: string;
  name_ne: string;
  province?: Province;
}

export interface Constituency {
  id: number;
  district_id: number;
  number: number;
  name_en: string;
  name_ne: string;
  total_registered_voters: number;
  status: "pending" | "counting" | "declared";
  total_votes_cast: number;
  updated_at: string;
  district?: District;
  candidates?: Candidate[];
}

export interface Party {
  id: number;
  name_en: string;
  name_ne: string;
  short_name: string;
  color: string;
  logo_url?: string;
  fptp_won: number;
  fptp_leading: number;
  pr_votes: number;
  pr_seats: number;
  total_seats: number;
  updated_at: string;
}

export interface Candidate {
  id: number;
  constituency_id: number;
  party_id: number | null;
  name_en: string;
  name_ne: string;
  votes: number;
  is_winner: boolean;
  is_leading: boolean;
  updated_at: string;
  party?: Party;
}

export interface PRVote {
  id: number;
  constituency_id: number;
  party_id: number;
  votes: number;
  updated_at: string;
  party?: Party;
}

export interface ElectionSummary {
  totalSeats: number;        // 275
  fptpSeats: number;         // 165
  prSeats: number;           // 110
  declared: number;
  counting: number;
  pending: number;
  totalVotesCast: number;
  totalPRVotes: number;
  lastUpdated: string | null;  // ISO string from API
}

// Legacy compatibility — maps to old data.json shape
export interface LegacyParty {
  name: string;
  nameNp: string;
  shortName: string;
  color: string;
  won: number;
  leading: number;
  totalVotes: number;
}

export interface LegacyCandidate {
  name: string;
  party: string;
  partyShort: string;
  votes: number;
  color: string;
}

export interface LegacyConstituency {
  id: number;
  name: string;
  province: string;
  status: "declared" | "counting" | "pending";
  totalVotes: number;
  candidates: LegacyCandidate[];
}

export interface LegacyElectionData {
  lastUpdated: string | null;
  totalSeats: number;
  parties: LegacyParty[];
  constituencies: LegacyConstituency[];
  summary: {
    totalSeats: number;
    declared: number;
    counting: number;
    pending: number;
    totalVotesCast: number;
  };
}
