import Header from "@/components/Header";
import SummaryCards from "@/components/SummaryCards";
import PartyResults from "@/components/PartyResults";
import ConstituencyResults from "@/components/ConstituencyResults";
import SeatBar from "@/components/SeatBar";
import DataSourceBanner from "@/components/DataSourceBanner";
import { getElectionData } from "@/data/electionData";

const DATA_SOURCES = [
  {
    name: "Election Commission Nepal",
    url: "https://result.election.gov.np/PRVoteChartResult2082.aspx",
  },
  {
    name: "eKantipur Election",
    url: "https://election.ekantipur.com/?lng=eng",
  },
  {
    name: "Hamro Patro Election",
    url: "https://app.hamropatro.com/election",
  },
];

export default function Home() {
  const { parties, constituencies, summary } = getElectionData();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header lastUpdated={summary.lastUpdated} totalSeats={summary.totalSeats} />

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Statistics */}
        <SummaryCards summary={summary} />

        {/* Seat Distribution Bar */}
        <SeatBar parties={parties} totalSeats={summary.totalSeats} />

        {/* Two-column layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <PartyResults parties={parties} totalSeats={summary.totalSeats} />
          </div>
          <div className="lg:col-span-2">
            <ConstituencyResults constituencies={constituencies} />
          </div>
        </div>

        {/* Data Sources */}
        <DataSourceBanner sources={DATA_SOURCES} />
      </main>
    </div>
  );
}
