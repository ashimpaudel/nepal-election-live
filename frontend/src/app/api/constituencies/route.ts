import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "edge";
export const revalidate = 30;

/**
 * GET /api/constituencies?province_id=1&district_id=5&status=declared
 * Returns constituencies with optional filters. Includes nested district and candidates.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get("province_id");
    const districtId = searchParams.get("district_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("constituencies")
      .select(`
        *,
        district:districts!inner(
          id, code, name_en, name_ne,
          province:provinces!inner(id, code, name_en, name_ne)
        ),
        candidates(
          id, name_en, name_ne, votes, is_winner, is_leading,
          party:parties(id, name_en, name_ne, short_name, color)
        )
      `)
      .order("id", { ascending: true });

    if (districtId) {
      query = query.eq("district_id", parseInt(districtId));
    }

    if (provinceId) {
      query = query.eq("district.province_id", parseInt(provinceId));
    }

    if (status && ["pending", "counting", "declared"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Constituencies API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch constituencies" },
      { status: 500 }
    );
  }
}
