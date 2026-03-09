"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import type { Party } from "@/lib/types";

// Lazy-load Leaflet to avoid SSR issues and reduce initial bundle
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);

// Default party colors per province (will be replaced by actual leading party data)
const DEFAULT_COLORS = [
  "#E11D48", "#2563EB", "#DC2626", "#F59E0B",
  "#8B5CF6", "#10B981", "#F97316",
];

interface NepalMapProps {
  leadingPartyByProvince?: Record<number, Party | null>;
}

export default function NepalMap({ leadingPartyByProvince }: NepalMapProps) {
  const router = useRouter();
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    import("@/data/geo/nepal-provinces.json").then((mod) => {
      setGeoData(mod.default as unknown as GeoJSON.FeatureCollection);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <MapIcon className="w-4 h-4 text-green-400" />
          Province Map
        </h2>
        <div className="h-[300px] sm:h-[400px] bg-gray-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onEachProvince(feature: any, layer: any) {
    const props = feature.properties;
    const provinceId = props.id;
    const name = props.name;
    const nameNe = props.name_ne;
    const leadingParty = leadingPartyByProvince?.[provinceId];

    layer.bindTooltip(
      `<strong>${name}</strong><br/>${nameNe}${
        leadingParty ? `<br/>Leading: ${leadingParty.short_name}` : ""
      }`,
      { sticky: true, className: "nepal-map-tooltip" }
    );

    layer.on("click", () => {
      router.push(`/province/${provinceId}`);
    });

    layer.on("mouseover", () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.7 });
    });

    layer.on("mouseout", () => {
      layer.setStyle({ weight: 1.5, fillOpacity: 0.5 });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function styleProvince(feature: any) {
    const provinceId = feature?.properties?.id;
    const leadingParty = leadingPartyByProvince?.[provinceId];
    const color = leadingParty?.color ?? DEFAULT_COLORS[(provinceId - 1) % DEFAULT_COLORS.length];

    return {
      fillColor: color,
      fillOpacity: 0.5,
      color: "#ffffff",
      weight: 1.5,
      opacity: 0.8,
    };
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
        <MapIcon className="w-4 h-4 text-green-400" />
        Province Map
        <span className="text-xs text-gray-500 font-normal ml-auto">
          Click a province to drill down
        </span>
      </h2>

      <div className="h-[300px] sm:h-[400px] rounded-xl overflow-hidden">
        {geoData && (
          <MapContainer
            center={[28.3, 84.0]}
            zoom={6}
            minZoom={5}
            maxZoom={9}
            style={{ height: "100%", width: "100%", background: "#1e293b" }}
            zoomControl={true}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />
            <GeoJSON
              data={geoData}
              style={styleProvince}
              onEachFeature={onEachProvince}
            />
          </MapContainer>
        )}
      </div>

      {/* Province legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {[1, 2, 3, 4, 5, 6, 7].map((id) => {
          const names: Record<number, string> = {
            1: "Koshi", 2: "Madhesh", 3: "Bagmati", 4: "Gandaki",
            5: "Lumbini", 6: "Karnali", 7: "Sudurpashchim",
          };
          const party = leadingPartyByProvince?.[id];
          const color = party?.color ?? DEFAULT_COLORS[(id - 1) % DEFAULT_COLORS.length];
          return (
            <button
              key={id}
              onClick={() => router.push(`/province/${id}`)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {names[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
