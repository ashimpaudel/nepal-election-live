"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import DrillDown from "@/components/DrillDown";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import { getSupabase } from "@/lib/supabase";
import type { District, Province, Constituency } from "@/lib/types";

export default function DistrictPage() {
  const params = useParams();
  const districtId = Number(params.id);

  const [district, setDistrict] = useState<District | null>(null);
  const [province, setProvince] = useState<Province | null>(null);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setLoading(false);
          return;
        }

        const dRes = await supabase
          .from("districts")
          .select("*")
          .eq("id", districtId)
          .single();

        if (dRes.data) {
          setDistrict(dRes.data);

          // Load province
          const pRes = await supabase
            .from("provinces")
            .select("*")
            .eq("id", dRes.data.province_id)
            .single();
          if (pRes.data) setProvince(pRes.data);
        }

        const cRes = await supabase
          .from("constituencies")
          .select("*")
          .eq("district_id", districtId)
          .order("number");
        if (cRes.data) setConstituencies(cRes.data);
      } catch (err) {
        console.warn("Failed to load district data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [districtId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={275} />
        <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="glass-card rounded-2xl p-4 animate-pulse h-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse h-24" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!district) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={275} />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-400">District not found</p>
        </main>
      </div>
    );
  }

  const STATUS_COLORS = {
    declared: "bg-green-900/50 text-green-400 border-green-700/50",
    counting: "bg-yellow-900/50 text-yellow-400 border-yellow-700/50",
    pending: "bg-gray-800/50 text-gray-500 border-gray-700/50",
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header lastUpdated={null} totalSeats={275} />

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <DrillDown
          breadcrumbs={[
            ...(province
              ? [
                  {
                    label: province.name_en,
                    href: `/province/${province.id}`,
                  },
                ]
              : []),
            { label: district.name_en, href: `/district/${district.id}` },
          ]}
        />

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-red-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                {district.name_en}
              </h1>
              <p className="text-sm text-gray-400">{district.name_ne}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {province?.name_en} • {constituencies.length} constituencies
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {constituencies.map((c) => (
            <Link
              key={c.id}
              href={`/constituency/${c.id}`}
              className="glass-card rounded-2xl p-4 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{c.name_en}</p>
                    <span
                      className={`${STATUS_COLORS[c.status]} border text-xs px-2 py-0.5 rounded-full`}
                    >
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{c.name_ne}</p>
                  {c.total_votes_cast > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {c.total_votes_cast.toLocaleString()} votes cast
                    </p>
                  )}
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
