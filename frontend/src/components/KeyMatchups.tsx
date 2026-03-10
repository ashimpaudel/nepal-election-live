"use client";

import { useEffect, useRef, useState } from "react";
import { Spotlight, Trophy, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static data – the historic races of 2082                          */
/* ------------------------------------------------------------------ */

interface Candidate {
  name: string;
  nameNe: string;
  party: string;
  color: string;
  votes: number;
  isWinner: boolean;
  photoId: string | null;
}

interface Matchup {
  constituency: string;
  narrative: string;
  narrativeNe: string;
  candidates: Candidate[];
  tagline: string;
}

const KEY_MATCHUPS: Matchup[] = [
  {
    constituency: "Jhapa-5",
    narrative: "The Race That Defined 2082",
    narrativeNe: "२०८२ को ऐतिहासिक प्रतिस्पर्धा",
    candidates: [
      { name: "Balendra Shah (Balen)", nameNe: "बालेन्द्र शाह", party: "RSP", color: "#F59E0B", votes: 65748, isWinner: true, photoId: null },
      { name: "KP Sharma Oli", nameNe: "केपी शर्मा ओली", party: "CPN-UML", color: "#2563EB", votes: 18734, isWinner: false, photoId: null },
    ],
    tagline: "Former PM Oli crushed by 47,000+ votes",
  },
  {
    constituency: "Chitwan-2",
    narrative: "The Hat-Trick",
    narrativeNe: "ह्याट्रिक",
    candidates: [
      { name: "Rabi Lamichhane", nameNe: "रवि लामिछाने", party: "RSP", color: "#F59E0B", votes: 54402, isWinner: true, photoId: null },
      { name: "Meena Kumari Kharel", nameNe: "मीना कुमारी खरेल", party: "NC", color: "#E11D48", votes: 14564, isWinner: false, photoId: null },
    ],
    tagline: "RSP founder wins 3rd consecutive election",
  },
  {
    constituency: "Gorkha-2",
    narrative: "The Survivor",
    narrativeNe: "जीवित रहनेहरू",
    candidates: [
      { name: "Pushpa Kamal Dahal", nameNe: "पुष्पकमल दाहाल", party: "CPN-MC", color: "#DC2626", votes: 10240, isWinner: true, photoId: null },
      { name: "Lilamani Gautam", nameNe: "लीलामणि गौतम", party: "RSP", color: "#F59E0B", votes: 3462, isWinner: false, photoId: null },
    ],
    tagline: "Only former PM to survive the RSP wave",
  },
  {
    constituency: "Kathmandu-1",
    narrative: "Capital's Verdict",
    narrativeNe: "राजधानीको फैसला",
    candidates: [
      { name: "Tosima Karki", nameNe: "तोसिमा कार्की", party: "RSP", color: "#F59E0B", votes: 43096, isWinner: true, photoId: null },
      { name: "Jitendra Kumar Shrestha", nameNe: "जितेन्द्र कुमार श्रेष्ठ", party: "UML", color: "#2563EB", votes: 9045, isWinner: false, photoId: null },
    ],
    tagline: "RSP dominates all 10 Kathmandu seats",
  },
  {
    constituency: "Morang-4",
    narrative: "The Engineer's Victory",
    narrativeNe: "इन्जिनियरको जित",
    candidates: [
      { name: "Swarnim Wagle", nameNe: "स्वर्णिम वाग्ले", party: "RSP", color: "#F59E0B", votes: 38040, isWinner: true, photoId: null },
      { name: "Govind Bhattarai", nameNe: "गोविन्द भट्टराई", party: "NC", color: "#E11D48", votes: 16231, isWinner: false, photoId: null },
    ],
    tagline: "Economist-turned-politician wins in landslide",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatVotes(n: number): string {
  return n.toLocaleString("en-US");
}

/* ------------------------------------------------------------------ */
/*  Intersection-observer hook for staggered reveal                   */
/* ------------------------------------------------------------------ */

function useSlideIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ------------------------------------------------------------------ */
/*  Candidate column inside a card                                    */
/* ------------------------------------------------------------------ */

function CandidateColumn({
  candidate,
  maxVotes,
  isWinner,
}: {
  candidate: Candidate;
  maxVotes: number;
  isWinner: boolean;
}) {
  const barPct = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;

  return (
    <div
      className="flex flex-col gap-1.5"
      style={{ borderLeft: `3px solid ${candidate.color}`, paddingLeft: 10 }}
    >
      {/* Name + check */}
      <div className="flex items-center gap-1">
        {isWinner && (
          <span className="text-green-400 text-xs font-bold" aria-label="Winner">
            ✓
          </span>
        )}
        <span
          className={`text-sm leading-tight ${
            isWinner ? "font-bold text-white" : "font-medium text-gray-300"
          }`}
        >
          {candidate.name.split(" ")[0]}{" "}
          <span className="text-gray-400">
            {candidate.name.split(" ").slice(1).join(" ")}
          </span>
        </span>
      </div>

      {/* Party + votes */}
      <div className="flex items-center gap-2 text-[11px]">
        <span
          className="font-semibold uppercase tracking-wide"
          style={{ color: candidate.color }}
        >
          {candidate.party}
        </span>
        <span className="text-gray-400 tabular-nums">
          {formatVotes(candidate.votes)}
        </span>
      </div>

      {/* Vote bar */}
      <div className="w-full bg-gray-700/30 rounded-full h-1.5 mt-0.5">
        <div
          className="h-1.5 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${barPct}%`,
            backgroundColor: candidate.color,
            opacity: isWinner ? 1 : 0.5,
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single matchup card                                               */
/* ------------------------------------------------------------------ */

function MatchupCard({ matchup, index }: { matchup: Matchup; index: number }) {
  const { ref, visible } = useSlideIn();

  const winner = matchup.candidates.find((c) => c.isWinner)!;
  const loser = matchup.candidates.find((c) => !c.isWinner)!;
  const maxVotes = Math.max(winner.votes, loser.votes);
  const margin = winner.votes - loser.votes;

  return (
    <div
      ref={ref}
      className="glass-card rounded-2xl overflow-hidden snap-start shrink-0 w-[340px] sm:w-auto sm:shrink"
      style={{
        transform: visible ? "translateX(0)" : "translateX(40px)",
        opacity: visible ? 1 : 0,
        transition: `transform 0.5s cubic-bezier(.22,1,.36,1) ${index * 100}ms, opacity 0.5s ease ${index * 100}ms`,
      }}
    >
      {/* Party-color gradient top edge */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${winner.color}, ${loser.color})`,
        }}
      />

      <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
        {/* Narrative label */}
        <p className="text-[11px] italic text-gray-400 tracking-wide leading-tight">
          {matchup.narrative}{" "}
          <span className="text-gray-500">• {matchup.narrativeNe}</span>
        </p>

        {/* Constituency */}
        <h3 className="text-base font-bold text-white -mt-1">
          {matchup.constituency}
        </h3>

        {/* Face-off */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
          {/* Winner side */}
          <CandidateColumn candidate={winner} maxVotes={maxVotes} isWinner />

          {/* Divider + margin */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <span className="w-px h-12 bg-gray-700/60" />
            <span className="text-[10px] font-semibold text-green-400 tabular-nums whitespace-nowrap">
              +{formatVotes(margin)}
            </span>
          </div>

          {/* Loser side */}
          <CandidateColumn candidate={loser} maxVotes={maxVotes} isWinner={false} />
        </div>

        {/* Tagline */}
        <p className="text-[11px] italic text-gray-500 mt-1 leading-snug">
          {matchup.tagline}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                      */
/* ------------------------------------------------------------------ */

export default function KeyMatchups() {
  return (
    <section className="w-full">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Spotlight className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-white tracking-tight">
          Key Races{" "}
          <span className="text-gray-500 font-medium text-sm">
            • मुख्य प्रतिस्पर्धा
          </span>
        </h2>
        <Trophy className="w-4 h-4 text-amber-500/60 ml-auto hidden sm:block" />
      </div>

      {/* Mobile: horizontal scroll · Desktop: grid */}
      <div
        className={[
          "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide",
          "sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible",
        ].join(" ")}
      >
        {KEY_MATCHUPS.map((m, i) => (
          <MatchupCard key={m.constituency} matchup={m} index={i} />
        ))}
      </div>

      {/* Scroll hint on mobile */}
      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-gray-600 sm:hidden">
        <span>Swipe for more</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </section>
  );
}
