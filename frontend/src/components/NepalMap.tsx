"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Map as MapIcon, ZoomIn } from "lucide-react";
import dynamic from "next/dynamic";
import type { Party } from "@/lib/types";
import type { Layer, LeafletMouseEvent } from "leaflet";

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

const PROVINCE_NAMES: Record<number, { en: string; ne: string }> = {
  1: { en: "Koshi Province", ne: "कोशी प्रदेश" },
  2: { en: "Madhesh Province", ne: "मधेश प्रदेश" },
  3: { en: "Bagmati Province", ne: "बागमती प्रदेश" },
  4: { en: "Gandaki Province", ne: "गण्डकी प्रदेश" },
  5: { en: "Lumbini Province", ne: "लुम्बिनी प्रदेश" },
  6: { en: "Karnali Province", ne: "कर्णाली प्रदेश" },
  7: { en: "Sudurpashchim Province", ne: "सुदूरपश्चिम प्रदेश" },
};

// Vibrant default gradient palette for provinces
const PROVINCE_COLORS = [
  "#E11D48", "#2563EB", "#DC2626", "#F59E0B",
  "#8B5CF6", "#10B981", "#F97316",
];

interface NepalMapProps {
  leadingPartyByProvince?: Record<number, Party | null>;
}

export default function NepalMap({ leadingPartyByProvince }: NepalMapProps) {
  const router = useRouter();
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [districtData, setDistrictData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredProvince, setHoveredProvince] = useState<number | null>(null);
  const [showDistricts, setShowDistricts] = useState(false);

  useEffect(() => {
    setMounted(true);
    import("@/data/geo/nepal-provinces.json").then((mod) => {
      setGeoData(mod.default as unknown as GeoJSON.FeatureCollection);
    });
    import("@/data/geo/nepal-districts.json").then((mod) => {
      setDistrictData(mod.default as unknown as GeoJSON.FeatureCollection);
    });
  }, []);

  const getProvinceColor = useCallback(
    (provinceId: number) => {
      const party = leadingPartyByProvince?.[provinceId];
      return party?.color ?? PROVINCE_COLORS[(provinceId - 1) % PROVINCE_COLORS.length];
    },
    [leadingPartyByProvince]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEachProvince = useCallback((feature: any, layer: Layer) => {
    const id: number = feature.properties.id;
    const info = PROVINCE_NAMES[id];
    if (!info) return;

    const party = leadingPartyByProvince?.[id];
    const tooltipHtml = `
      <div style="text-align:center">
        <strong style="font-size:13px">${info.en}</strong><br/>
        <span style="opacity:0.7">${info.ne}</span>
        ${party ? `<br/><span style="color:${party.color};font-weight:bold">▸ ${party.short_name} leading</span>` : ""}
      </div>
    `;

    layer.bindTooltip(tooltipHtml, {
      sticky: true,
      className: "nepal-map-tooltip",
      direction: "top",
      offset: [0, -10],
    });

    layer.on("click", () => router.push(`/province/${id}`));
    layer.on("mouseover", (e: LeafletMouseEvent) => {
      setHoveredProvince(id);
      e.target.setStyle({ weight: 3, fillOpacity: 0.8, color: "#ffffff" });
      e.target.bringToFront();
    });
    layer.on("mouseout", (e: LeafletMouseEvent) => {
      setHoveredProvince(null);
      e.target.setStyle({ weight: 1.5, fillOpacity: 0.55, color: "rgba(255,255,255,0.5)" });
    });
  }, [leadingPartyByProvince, router]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styleProvince = useCallback((feature: any) => {
    const id: number = feature?.properties?.id;
    return {
      fillColor: getProvinceColor(id),
      fillOpacity: 0.55,
      color: "rgba(255,255,255,0.5)",
      weight: 1.5,
      opacity: 1,
    };
  }, [getProvinceColor]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styleDistrict = useCallback((_feature: any) => ({
    fillColor: "transparent",
    fillOpacity: 0,
    color: "rgba(255,255,255,0.15)",
    weight: 0.5,
    opacity: 1,
  }), []);

  if (!mounted) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <MapIcon className="w-4 h-4 text-green-400" />
          Province Map
        </h2>
        <div className="h-[350px] sm:h-[450px] bg-gray-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-green-400" />
          Province Map
          {hoveredProvince && (
            <span className="text-xs font-normal text-gray-400 ml-2 animate-fade-in">
              {PROVINCE_NAMES[hoveredProvince]?.en}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDistricts(!showDistricts)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              showDistricts
                ? "bg-blue-600 text-white"
                : "bg-gray-700/50 text-gray-400 hover:text-white"
            }`}
          >
            <ZoomIn className="w-3 h-3 inline mr-1" />
            {showDistricts ? "Districts ON" : "Districts"}
          </button>
          <span className="text-xs text-gray-500 hidden sm:inline">
            Click a province to drill down
          </span>
        </div>
      </div>

      <div className="h-[350px] sm:h-[450px] rounded-xl overflow-hidden border border-gray-700/30">
        {geoData && (
          <MapContainer
            center={[28.3, 84.1]}
            zoom={7}
            minZoom={6}
            maxZoom={10}
            style={{ height: "100%", width: "100%", background: "#0f172a" }}
            zoomControl={true}
            attributionControl={false}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />

            {/* District boundaries (subtle, toggle-able) */}
            {showDistricts && districtData && (
              <GeoJSON data={districtData} style={styleDistrict} />
            )}

            {/* Province boundaries (main layer) */}
            <GeoJSON
              key="provinces"
              data={geoData}
              style={styleProvince}
              onEachFeature={onEachProvince}
            />
          </MapContainer>
        )}
      </div>

      {/* Province legend with color bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-3">
        {[1, 2, 3, 4, 5, 6, 7].map((id) => {
          const info = PROVINCE_NAMES[id];
          const party = leadingPartyByProvince?.[id];
          const color = party?.color ?? PROVINCE_COLORS[(id - 1) % PROVINCE_COLORS.length];
          const isHovered = hoveredProvince === id;
          return (
            <button
              key={id}
              onClick={() => router.push(`/province/${id}`)}
              className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 transition-all ${
                isHovered
                  ? "bg-white/10 text-white scale-105"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0 shadow-lg"
                style={{
                  backgroundColor: color,
                  boxShadow: isHovered ? `0 0 8px ${color}` : "none",
                }}
              />
              <span className="truncate">{info.en.replace(" Province", "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
