import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "edge";
export const revalidate = 30;

/**
 * GET /api/pr-results
 * Returns PR (Proportional Representation) results aggregated by party.
 * Includes total PR votes, seat allocation, and 3% threshold status.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ totalPRVotes: 0, threshold: 0, totalPRSeats: 110, parties: [] });
    }

    const { data: parties, error } = await supabase
      .from("parties")
      .select("id, name_en, name_ne, short_name, color, pr_votes, pr_seats")
      .order("pr_votes", { ascending: false });

    if (error) throw error;

    const totalPRVotes = parties?.reduce((s, p) => s + (p.pr_votes || 0), 0) ?? 0;
    const threshold = Math.floor(totalPRVotes * 0.03); // 3% threshold for PR seats

    const results = (parties ?? []).map((p) => ({
      ...p,
      pr_vote_percent:
        totalPRVotes > 0
          ? parseFloat(((p.pr_votes / totalPRVotes) * 100).toFixed(2))
          : 0,
      meets_threshold: p.pr_votes >= threshold,
    }));

    return NextResponse.json(
      {
        totalPRVotes,
        threshold,
        totalPRSeats: 110,
        parties: results,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("PR Results API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch PR results" },
      { status: 500 }
    );
  }
}
