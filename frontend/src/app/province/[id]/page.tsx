"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Users, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import DrillDown from "@/components/DrillDown";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import { supabase } from "@/lib/supabase";
import type { Province, District } from "@/lib/types";

export default function ProvincePage() {
  const params = useParams();
  const provinceId = Number(params.id);

  const [province, setProvince] = useState<Province | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pRes, dRes] = await Promise.all([
        supabase.from("provinces").select("*").eq("id", provinceId).single(),
        supabase
          .from("districts")
          .select("*")
          .eq("province_id", provinceId)
          .order("name_en"),
      ]);

      if (pRes.data) setProvince(pRes.data);
      if (dRes.data) setDistricts(dRes.data);
      setLoading(false);
    }
    load();
  }, [provinceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={275} />
        <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="glass-card rounded-2xl p-4 animate-pulse h-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse h-24" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!province) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={275} />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-400">Province not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header lastUpdated={null} totalSeats={275} />

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <DrillDown
          breadcrumbs={[
            { label: province.name_en, href: `/province/${province.id}` },
          ]}
        />

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-red-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                {province.name_en}
              </h1>
              <p className="text-sm text-gray-400">{province.name_ne}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {districts.length} districts
          </p>
        </div>

        <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Districts
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {districts.map((d) => (
            <Link
              key={d.id}
              href={`/district/${d.id}`}
              className="glass-card rounded-2xl p-4 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{d.name_en}</p>
                  <p className="text-xs text-gray-500">{d.name_ne}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <DisclaimerFooter />
    </div>
  );
}
