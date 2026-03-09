import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "edge";
export const revalidate = 30;

/**
 * GET /api/pa-results?province_id=N
 * Returns Provincial Assembly results for a given province (1-7).
 * Includes party-wise seat breakdown and constituency summary.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceIdParam = searchParams.get("province_id");

    if (!provinceIdParam) {
      return NextResponse.json(
        { error: "province_id query parameter is required (1-7)" },
        { status: 400 }
      );
    }

    const provinceId = parseInt(provinceIdParam, 10);
    if (isNaN(provinceId) || provinceId < 1 || provinceId > 7) {
      return NextResponse.json(
        { error: "province_id must be between 1 and 7" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({
        province_id: provinceId,
        summary: {
          totalConstituencies: 0,
          declared: 0,
          counting: 0,
          pending: 0,
          totalVotesCast: 0,
        },
        parties: [],
      });
    }

    // Fetch party results for this province
    const { data: parties, error: partiesErr } = await supabase
      .from("pa_party_results")
      .select(
        "*, party:parties(id, name_en, name_ne, short_name, color)"
      )
      .eq("province_id", provinceId)
      .order("total_seats", { ascending: false });

    if (partiesErr) throw partiesErr;

    // Fetch constituency status for this province
    const { data: constituencies, error: constErr } = await supabase
      .from("pa_constituencies")
      .select("status, total_votes_cast")
      .eq("province_id", provinceId);

    if (constErr) throw constErr;

    const totalConstituencies = constituencies?.length ?? 0;
    const declared =
      constituencies?.filter((c) => c.status === "declared").length ?? 0;
    const counting =
      constituencies?.filter((c) => c.status === "counting").length ?? 0;
    const pending =
      constituencies?.filter((c) => c.status === "pending").length ?? 0;
    const totalVotesCast =
      constituencies?.reduce((s, c) => s + (c.total_votes_cast || 0), 0) ?? 0;

    return NextResponse.json(
      {
        province_id: provinceId,
        summary: {
          totalConstituencies,
          declared,
          counting,
          pending,
          totalVotesCast,
        },
        parties: parties ?? [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("PA Results API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch PA results" },
      { status: 500 }
    );
  }
}
