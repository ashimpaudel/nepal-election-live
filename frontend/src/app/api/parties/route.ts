import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "edge";
export const revalidate = 30;

/**
 * GET /api/parties
 * Returns all parties with FPTP and PR results, sorted by total seats descending.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json([]);
    }

    const { data: parties, error } = await supabase
      .from("parties")
      .select("*")
      .order("total_seats", { ascending: false });

    if (error) throw error;

    return NextResponse.json(parties ?? [], {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Parties API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch parties" },
      { status: 500 }
    );
  }
}
