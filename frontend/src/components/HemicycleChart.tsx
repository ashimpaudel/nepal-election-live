"use client";

import { useState, useMemo, useEffect } from "react";
import { Building2 } from "lucide-react";

interface HemicycleChartProps {
  parties: Array<{
    name: string;
    shortName: string;
    color: string;
    won: number;
    leading: number;
    prSeats: number;
    totalSeats: number;
  }>;
  totalSeats: number; // 275
}

interface SeatInfo {
  x: number;
  y: number;
  row: number;
  index: number;
  party: string | null;
  shortName: string | null;
  color: string;
  status: "won" | "leading" | "empty";
}

// Distribute N total seats across `numRows` rows so inner rows are smaller
function computeRowDistribution(
  totalSeats: number,
  numRows: number
): number[] {
  // Linear distribution: row i gets baseSeats + i * step
  // Sum = numRows * baseSeats + step * numRows*(numRows-1)/2 = totalSeats
  const step = 3;
  const triangular = (numRows * (numRows - 1)) / 2;
  const baseSeats = Math.round((totalSeats - step * triangular) / numRows);
  const rows: number[] = [];
  let sum = 0;
  for (let i = 0; i < numRows; i++) {
    rows.push(baseSeats + i * step);
    sum += rows[i];
  }
  // Adjust last row to absorb rounding remainder
  rows[numRows - 1] += totalSeats - sum;
  return rows;
}

export default function HemicycleChart({
  parties,
  totalSeats,
}: HemicycleChartProps) {
  const [hoveredSeat, setHoveredSeat] = useState<SeatInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger staggered mount animation
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const majority = Math.floor(totalSeats / 2) + 1;

  // Build ordered seat assignments: largest parties from center outward
  // FPTP won + PR seats = confirmed ("won"), FPTP leading = still counting ("leading")
  const seatAssignments = useMemo(() => {
    const sorted = [...parties]
      .filter((p) => (p.totalSeats || (p.won + p.leading)) > 0)
      .sort((a, b) => {
        const aTotal = a.totalSeats || (a.won + a.leading);
        const bTotal = b.totalSeats || (b.won + b.leading);
        return bTotal - aTotal;
      });

    const assignments: Array<{
      party: string;
      shortName: string;
      color: string;
      status: "won" | "leading";
    }> = [];

    for (const party of sorted) {
      const confirmedSeats = party.won + (party.prSeats ?? 0);
      for (let i = 0; i < confirmedSeats; i++) {
        assignments.push({
          party: party.name,
          shortName: party.shortName,
          color: party.color,
          status: "won",
        });
      }
      for (let i = 0; i < party.leading; i++) {
        assignments.push({
          party: party.name,
          shortName: party.shortName,
          color: party.color,
          status: "leading",
        });
      }
    }
    return assignments;
  }, [parties]);

  // Arrange seats from center outward within each row
  const seats = useMemo(() => {
    const numRows = 8;
    const viewW = 800;
    const centerX = viewW / 2;
    const centerY = 390;
    const innerRadius = 110;
    const rowGap = 34;
    const seatRadius = 5.8;

    const rowDist = computeRowDistribution(totalSeats, numRows);

    // Build all seat positions row by row
    const allSeats: SeatInfo[] = [];

    // We want to fill seats from center outward in each row.
    // First, compute positions for every row, then assign seats.
    const rowPositions: Array<{ x: number; y: number; row: number }[]> = [];

    for (let r = 0; r < numRows; r++) {
      const radius = innerRadius + r * rowGap;
      const seatsInRow = rowDist[r];
      const positions: { x: number; y: number; row: number }[] = [];

      // Slight padding at edges so dots don't clip the boundary
      const padAngle = 0.04;
      const startAngle = Math.PI - padAngle;
      const endAngle = padAngle;

      for (let s = 0; s < seatsInRow; s++) {
        const angle =
          seatsInRow === 1
            ? Math.PI / 2
            : startAngle - (s / (seatsInRow - 1)) * (startAngle - endAngle);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY - radius * Math.sin(angle);
        positions.push({ x, y, row: r });
      }
      rowPositions.push(positions);
    }

    // Build center-outward ordering for each row
    // Center index → spiral outward (center, center+1, center-1, center+2, ...)
    function centerOutOrder(count: number): number[] {
      const order: number[] = [];
      const mid = Math.floor(count / 2);
      order.push(mid);
      for (let d = 1; d <= mid; d++) {
        if (mid + d < count) order.push(mid + d);
        if (mid - d >= 0) order.push(mid - d);
      }
      return order;
    }

    // Flatten all rows into center-out ordering
    const orderedIndices: { row: number; seatIdx: number }[] = [];
    for (let r = 0; r < numRows; r++) {
      const co = centerOutOrder(rowDist[r]);
      for (const idx of co) {
        orderedIndices.push({ row: r, seatIdx: idx });
      }
    }

    // Assign parties to center-out ordered positions
    for (let i = 0; i < orderedIndices.length; i++) {
      const { row, seatIdx } = orderedIndices[i];
      const pos = rowPositions[row][seatIdx];
      const assignment = i < seatAssignments.length ? seatAssignments[i] : null;

      allSeats.push({
        x: pos.x,
        y: pos.y,
        row,
        index: i,
        party: assignment?.party ?? null,
        shortName: assignment?.shortName ?? null,
        color: assignment?.color ?? "#1e293b",
        status: assignment?.status ?? "empty",
      });
    }

    // Sort by row then by x position for consistent SVG rendering
    allSeats.sort((a, b) => a.row - b.row || a.x - b.x);

    return { allSeats, seatRadius, centerX, centerY };
  }, [totalSeats, seatAssignments]);

  // Party summary for legend
  const legendParties = useMemo(() => {
    return [...parties]
      .filter((p) => (p.totalSeats || (p.won + p.leading)) > 0)
      .sort((a, b) => {
        const aTotal = a.totalSeats || (a.won + a.leading);
        const bTotal = b.totalSeats || (b.won + b.leading);
        return bTotal - aTotal;
      });
  }, [parties]);

  const totalConfirmed = parties.reduce((s, p) => s + p.won + (p.prSeats ?? 0), 0);
  const totalLeading = parties.reduce((s, p) => s + p.leading, 0);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              सदन संरचना{" "}
              <span className="text-gray-400 font-medium">
                • House Composition
              </span>
            </h2>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span className="tabular-nums">
              {totalConfirmed + totalLeading}/{totalSeats}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Hemicycle */}
      <div className="relative px-2 sm:px-4 pt-4 pb-2">
        <svg
          viewBox="0 0 800 420"
          className="w-full h-auto"
          role="img"
          aria-label={`Hemicycle chart showing ${totalSeats} parliamentary seats`}
        >
          <defs>
            {/* Subtle shadow for won seats */}
            <filter id="seat-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Majority arc indicator */}
          <MajorityArc
            majority={majority}
            totalSeats={totalSeats}
            centerX={seats.centerX}
            centerY={seats.centerY}
          />

          {/* Seats */}
          {seats.allSeats.map((seat, i) => {
            const isHovered =
              hoveredSeat?.party != null &&
              hoveredSeat.party === seat.party;
            const dimmed =
              hoveredSeat !== null &&
              hoveredSeat.party !== null &&
              seat.party !== hoveredSeat.party;

            return (
              <circle
                key={i}
                cx={seat.x}
                cy={seat.y}
                r={seats.seatRadius}
                fill={seat.color}
                stroke={
                  seat.status === "empty"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.12)"
                }
                strokeWidth={seat.status === "empty" ? 0.5 : 0.6}
                filter={
                  seat.status === "won" && isHovered
                    ? "url(#seat-glow)"
                    : undefined
                }
                opacity={
                  !mounted
                    ? 0
                    : dimmed
                      ? 0.2
                      : 1
                }
                className={[
                  "transition-opacity duration-300",
                  seat.status === "leading" ? "hemicycle-pulse" : "",
                  mounted ? "hemicycle-seat-enter" : "",
                ].join(" ")}
                style={{
                  animationDelay: mounted
                    ? `${seat.row * 80}ms`
                    : undefined,
                  cursor: seat.party ? "pointer" : "default",
                }}
                onMouseEnter={(e) => {
                  if (seat.party) {
                    setHoveredSeat(seat);
                    const svgRect = (
                      e.currentTarget.ownerSVGElement as SVGSVGElement
                    ).getBoundingClientRect();
                    const scaleX = svgRect.width / 800;
                    const scaleY = svgRect.height / 420;
                    setTooltipPos({
                      x: seat.x * scaleX,
                      y: seat.y * scaleY,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredSeat(null)}
              />
            );
          })}

          {/* Center label */}
          <text
            x={seats.centerX}
            y={seats.centerY + 8}
            textAnchor="middle"
            className="fill-gray-600 text-[10px] font-medium"
            style={{ fontSize: "10px" }}
          >
            {totalSeats} seats
          </text>

          {/* Majority label */}
          <text
            x={seats.centerX}
            y={28}
            textAnchor="middle"
            className="fill-gray-500 text-[9px]"
            style={{ fontSize: "9px" }}
          >
            Majority: {majority}
          </text>
        </svg>

        {/* Tooltip */}
        {hoveredSeat && hoveredSeat.party && (
          <div
            className="absolute pointer-events-none z-50 animate-fade-in"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 48,
              transform: "translateX(-50%)",
            }}
          >
            <div className="glass rounded-lg px-3 py-1.5 border border-white/10 shadow-xl whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: hoveredSeat.color }}
                />
                <span className="text-xs font-semibold text-white">
                  {hoveredSeat.shortName}
                </span>
                <span className="text-[10px] text-gray-400">
                  {hoveredSeat.status === "won" ? "Won" : "Leading"}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {hoveredSeat.party}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 sm:px-6 pb-4 pt-1">
        {/* Won / Leading summary */}
        <div className="flex items-center justify-center gap-4 mb-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Confirmed: {totalConfirmed}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400 hemicycle-pulse" />
            Leading: {totalLeading}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1e293b] border border-white/10" />
            Pending: {totalSeats - totalConfirmed - totalLeading}
          </span>
        </div>

        {/* Party legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          {legendParties.slice(0, 10).map((party) => (
            <div
              key={party.shortName}
              className="flex items-center gap-1.5 group cursor-default"
              onMouseEnter={() =>
                setHoveredSeat({
                  x: 0,
                  y: 0,
                  row: 0,
                  index: 0,
                  party: party.name,
                  shortName: party.shortName,
                  color: party.color,
                  status: "won",
                })
              }
              onMouseLeave={() => setHoveredSeat(null)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/10"
                style={{ backgroundColor: party.color }}
              />
              <span className="text-[11px] text-gray-400 group-hover:text-white transition-colors">
                {party.shortName}
              </span>
              <span className="text-[10px] tabular-nums text-gray-600">
                {party.totalSeats || (party.won + party.leading)}
              </span>
            </div>
          ))}
          {legendParties.length > 10 && (
            <span className="text-[10px] text-gray-600">
              +{legendParties.length - 10} more
            </span>
          )}
        </div>
      </div>

      {/* Scoped CSS for animations */}
      <style>{`
        @keyframes hemicycle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .hemicycle-pulse {
          animation: hemicycle-pulse 2s ease-in-out infinite;
        }
        @keyframes hemicycle-enter {
          from {
            opacity: 0;
            transform: scale(0.3);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .hemicycle-seat-enter {
          animation: hemicycle-enter 0.4s ease-out both;
        }
      `}</style>
    </div>
  );
}

/* ─── Majority Arc Sub-component ─── */
function MajorityArc({
  majority,
  totalSeats,
  centerX,
  centerY,
}: {
  majority: number;
  totalSeats: number;
  centerX: number;
  centerY: number;
}) {
  // Draw a subtle dashed arc at the majority threshold
  const innerR = 96;
  const outerR = 376;
  // Majority fraction of the semicircle — seats fill center-out,
  // so we mark the midpoint line for simple visual reference
  const angle = Math.PI / 2; // vertical center line

  const x = centerX + 0 * Math.cos(angle); // center
  const topY = centerY - outerR;
  const bottomY = centerY - innerR;

  return (
    <g opacity={0.3}>
      <line
        x1={centerX}
        y1={topY}
        x2={centerX}
        y2={bottomY}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text
        x={centerX + 6}
        y={topY + 12}
        className="fill-gray-500"
        style={{ fontSize: "8px" }}
      >
        {majority}
      </text>
    </g>
  );
}
