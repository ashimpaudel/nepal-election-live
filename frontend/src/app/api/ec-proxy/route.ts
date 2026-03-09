import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // needs full node for cookie handling
export const revalidate = 30;

const EC_BASE = "https://result.election.gov.np";
const EC_PAGE = `${EC_BASE}/PRVoteChartResult2082.aspx`;
const EC_JSON = `${EC_BASE}/Handlers/SecureJson.ashx`;

const VALID_FILES: Record<string, string> = {
  "pr": "PRHoRPartyTop5.txt",
  "fptp": "HoRPartyTop5.txt",
  "pa-s1": "PAPartyTop5-S1.txt",
  "pa-s2": "PAPartyTop5-S2.txt",
  "pa-s3": "PAPartyTop5-S3.txt",
  "pa-s4": "PAPartyTop5-S4.txt",
  "pa-s5": "PAPartyTop5-S5.txt",
  "pa-s6": "PAPartyTop5-S6.txt",
  "pa-s7": "PAPartyTop5-S7.txt",
};

// Session cache — reuse cookies for 5 minutes
let cachedSession: { cookies: string; csrf: string; ts: number } | null = null;
const SESSION_TTL = 5 * 60 * 1000;

async function getSession(): Promise<{ cookies: string; csrf: string }> {
  if (cachedSession && Date.now() - cachedSession.ts < SESSION_TTL) {
    return cachedSession;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(EC_PAGE, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0",
      },
    });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    const cookieStr = setCookies.map((c) => c.split(";")[0]).join("; ");
    const csrfCookie = setCookies.find((c) => c.startsWith("CsrfToken="));
    const csrf = csrfCookie?.split("=")[1]?.split(";")[0] ?? "";

    cachedSession = { cookies: cookieStr, csrf, ts: Date.now() };
    return cachedSession;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /api/ec-proxy?type=pr    → PR vote data
 * GET /api/ec-proxy?type=fptp  → FPTP seat data
 */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "pr";
  const file = VALID_FILES[type];

  if (!file) {
    return NextResponse.json(
      { error: `Invalid type. Use: ${Object.keys(VALID_FILES).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const session = await getSession();
    const url = `${EC_JSON}?file=JSONFiles/Election2082/Common/${file}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0",
          Cookie: session.cookies,
          "X-CSRF-Token": session.csrf,
          "X-Requested-With": "XMLHttpRequest",
          Referer: EC_PAGE,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        // Session expired, clear cache and retry once
        cachedSession = null;
        const newSession = await getSession();
        const retry = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0",
            Cookie: newSession.cookies,
            "X-CSRF-Token": newSession.csrf,
            "X-Requested-With": "XMLHttpRequest",
            Referer: EC_PAGE,
            Accept: "application/json",
          },
        });
        if (!retry.ok) throw new Error(`EC returned ${retry.status}`);
        const data = await retry.json();
        return NextResponse.json(
          { type, file, data, lastFetched: new Date().toISOString() },
          { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
        );
      }

      const data = await res.json();
      return NextResponse.json(
        { type, file, data, lastFetched: new Date().toISOString() },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("EC proxy error:", message);
    return NextResponse.json(
      { error: "Failed to fetch from Election Commission", detail: message },
      { status: 502 }
    );
  }
}
