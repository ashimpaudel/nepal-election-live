import { BarChart3, CheckCircle2, Timer, AlertCircle, Vote } from "lucide-react";
import type { ElectionSummary } from "@/data/electionData";

interface SummaryCardsProps {
  summary: ElectionSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Seats",
      value: summary.totalSeats,
      sublabel: `${165} FPTP + ${110} PR`,
      icon: BarChart3,
      bg: "glass-card",
      border: "border-gray-600/30",
      text: "text-white",
      iconColor: "text-blue-400",
    },
    {
      label: "Declared",
      value: summary.declared,
      sublabel: "घोषित",
      icon: CheckCircle2,
      bg: "glass-card",
      border: "border-green-500/30",
      text: "text-green-400",
      iconColor: "text-green-400",
    },
    {
      label: "Counting",
      value: summary.counting,
      sublabel: "मतगणना",
      icon: Timer,
      bg: "glass-card",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      iconColor: "text-yellow-400",
    },
    {
      label: "Pending",
      value: summary.pending,
      sublabel: "बाँकी",
      icon: AlertCircle,
      bg: "glass-card",
      border: "border-red-500/30",
      text: "text-red-400",
      iconColor: "text-red-400",
    },
    {
      label: "Total Votes",
      value: summary.totalVotesCast,
      sublabel: "कुल मतदान",
      icon: Vote,
      bg: "glass-card",
      border: "border-purple-500/30",
      text: "text-purple-400",
      iconColor: "text-purple-400",
      isLarge: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const displayValue =
          "isLarge" in card && card.isLarge
            ? card.value.toLocaleString()
            : card.value;
        return (
          <div
            key={card.label}
            className={`${card.bg} ${card.border} border rounded-2xl p-4 text-center`}
          >
            <div className="flex justify-center mb-1">
              <Icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {card.label}
            </p>
            <p className={`text-2xl sm:text-3xl font-black ${card.text} mt-1`}>
              {displayValue}
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
