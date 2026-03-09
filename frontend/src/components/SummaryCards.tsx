"use client";

import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Timer, AlertCircle, Vote } from "lucide-react";
import type { ElectionSummary } from "@/data/electionData";

interface SummaryCardsProps {
  summary: ElectionSummary;
}

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = performance.now();
    const from = display;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Seats",
      value: summary.totalSeats,
      sublabel: `${165} FPTP + ${110} PR`,
      icon: BarChart3,
      gradient: "from-blue-500/20 to-blue-600/5",
      border: "border-blue-500/20",
      text: "text-white",
      iconColor: "text-blue-400",
      glow: "shadow-blue-500/10",
    },
    {
      label: "Declared",
      value: summary.declared,
      sublabel: "घोषित",
      icon: CheckCircle2,
      gradient: "from-green-500/20 to-green-600/5",
      border: "border-green-500/20",
      text: "text-green-400",
      iconColor: "text-green-400",
      glow: "shadow-green-500/10",
    },
    {
      label: "Counting",
      value: summary.counting,
      sublabel: "मतगणना",
      icon: Timer,
      gradient: "from-yellow-500/20 to-yellow-600/5",
      border: "border-yellow-500/20",
      text: "text-yellow-400",
      iconColor: "text-yellow-400",
      glow: "shadow-yellow-500/10",
    },
    {
      label: "Pending",
      value: summary.pending,
      sublabel: "बाँकी",
      icon: AlertCircle,
      gradient: "from-red-500/20 to-red-600/5",
      border: "border-red-500/20",
      text: "text-red-400",
      iconColor: "text-red-400",
      glow: "shadow-red-500/10",
    },
    {
      label: "Total Votes",
      value: summary.totalVotesCast,
      sublabel: "कुल मतदान",
      icon: Vote,
      gradient: "from-purple-500/20 to-purple-600/5",
      border: "border-purple-500/20",
      text: "text-purple-400",
      iconColor: "text-purple-400",
      glow: "shadow-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`glass-card bg-gradient-to-br ${card.gradient} ${card.border} border rounded-2xl p-4 sm:p-5 text-center shadow-lg ${card.glow} hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex justify-center mb-2">
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-medium">
              {card.label}
            </p>
            <p className={`text-2xl sm:text-3xl font-black ${card.text} mt-1 tabular-nums`}>
              <AnimatedNumber value={card.value} />
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{card.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
