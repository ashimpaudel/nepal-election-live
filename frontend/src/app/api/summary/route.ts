import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "edge";
export const revalidate = 30; // ISR: revalidate every 30 seconds

/**
 * GET /api/summary
 * Returns overall election summary: total seats, declared, counting, pending, votes.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({
        totalSeats: 275, fptpSeats: 165, prSeats: 110,
        declared: 0, counting: 0, pending: 165,
        totalVotesCast: 0, totalPRVotes: 0,
        lastUpdated: null,
      });
    }

    // Fetch aggregated party stats
    const { data: parties, error: pErr } = await supabase
      .from("parties")
      .select("fptp_won, fptp_leading, pr_votes, pr_seats, total_seats");

    if (pErr) throw pErr;

    // Fetch constituency status counts
    const { data: constituencies, error: cErr } = await supabase
      .from("constituencies")
      .select("status, total_votes_cast");

    if (cErr) throw cErr;

    const declared = constituencies?.filter((c) => c.status === "declared").length ?? 0;
    const counting = constituencies?.filter((c) => c.status === "counting").length ?? 0;
    const pending = constituencies?.filter((c) => c.status === "pending").length ?? 0;
    const totalVotesCast = constituencies?.reduce((s, c) => s + (c.total_votes_cast || 0), 0) ?? 0;
    const totalPRVotes = parties?.reduce((s, p) => s + (p.pr_votes || 0), 0) ?? 0;

    const summary = {
      totalSeats: 275,
      fptpSeats: 165,
      prSeats: 110,
      declared,
      counting,
      pending,
      totalVotesCast,
      totalPRVotes,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Summary API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
