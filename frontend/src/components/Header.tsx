"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Radio, Clock } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { type Locale } from "@/i18n/config";

interface HeaderProps {
  lastUpdated: Date | null;
  totalSeats: number;
}

export default function Header({ lastUpdated, totalSeats }: HeaderProps) {
  const [locale, setLocale] = useState<Locale>("en");

  return (
    <header className="glass border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Nepal flag accent — gradient bars */}
          <div className="flex gap-0.5">
            <div className="w-1 h-9 bg-gradient-to-b from-red-500 to-red-700 rounded-full" />
            <div className="w-1 h-9 bg-gradient-to-b from-blue-600 to-blue-900 rounded-full" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              🗳️ Nepal Election <span className="bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">LIVE</span>
            </h1>
            <p className="text-[11px] text-gray-500">
              प्रतिनिधि सभा निर्वाचन २०८२ • {totalSeats} Seats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher currentLocale={locale} onLocaleChange={setLocale} />
          <span className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-full live-pulse shadow-lg shadow-red-600/20">
            <Radio className="w-3 h-3" />
            LIVE
          </span>
          {lastUpdated && (
            <span className="text-[11px] text-gray-500 hidden sm:flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" />
              {format(lastUpdated, "HH:mm:ss")}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}