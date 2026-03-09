"use client";

import { format } from "date-fns";
import { Radio, Clock } from "lucide-react";

interface HeaderProps {
  lastUpdated: Date | null;
  totalSeats: number;
}

export default function Header({ lastUpdated, totalSeats }: HeaderProps) {
  return (
    <header className="glass border-b border-red-900/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Nepal flag accent */}
          <div className="flex gap-1">
            <div className="w-1 h-8 bg-red-600 rounded" />
            <div className="w-1 h-8 bg-blue-800 rounded" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              🗳️ Nepal Election <span className="text-red-500">LIVE</span>
            </h1>
            <p className="text-xs text-gray-400">
              प्रतिनिधि सभा निर्वाचन २०८२ • {totalSeats} Seats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="flex items-center gap-1.5 bg-red-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-full live-pulse">
            <Radio className="w-3 h-3" />
            LIVE
          </span>
          {lastUpdated && (
            <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(lastUpdated, "HH:mm:ss")}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}