import type { ElectionSummary } from "@/data/electionData";

interface SummaryCardsProps {
  summary: ElectionSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Seats",
      value: summary.totalSeats,
      sublabel: "प्रतिनिधि सभा",
      bg: "bg-gray-800",
      border: "border-gray-700",
      text: "text-white",
    },
    {
      label: "Declared",
      value: summary.declared,
      sublabel: "घोषित",
      bg: "bg-green-900/40",
      border: "border-green-700",
      text: "text-green-400",
    },
    {
      label: "Counting",
      value: summary.counting,
      sublabel: "मतगणना",
      bg: "bg-yellow-900/40",
      border: "border-yellow-700",
      text: "text-yellow-400",
    },
    {
      label: "Pending",
      value: summary.pending,
      sublabel: "बाँकी",
      bg: "bg-red-900/40",
      border: "border-red-700",
      text: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} ${card.border} border rounded-xl p-4 text-center`}
        >
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            {card.label}
          </p>
          <p className={`text-3xl font-black ${card.text} mt-1`}>
            {card.value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{card.sublabel}</p>
        </div>
      ))}
    </div>
  );
}
