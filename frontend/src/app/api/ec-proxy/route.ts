import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // needs full node for cookie handling
export const revalidate = 30;

const EC_BASE = "https://result.election.gov.np";
const EC_PAGE = `${EC_BASE}/PRVoteChartResult2082.aspx`;
const EC_JSON = `${EC_BASE}/Handlers/SecureJson.ashx`;

const VALID_FILES: Record<string, string> = {
  // HoR (House of Representatives) results
  "fptp": "HoRPartyTop5.txt",
  "fptp-all": "HoRPartyAll.txt",
  "pr": "PRHoRPartyTop5.txt",
  "pr-all": "PRHoRPartyAll.txt",
  "hor-const": "HoRConstResult.txt",
  "hor-cand": "HoRCandResult.txt",
  "pr-const": "PRConstResult.txt",
  // Provincial Assembly (PA) results
  "pa-s1": "PAPartyTop5-S1.txt",
  "pa-s2": "PAPartyTop5-S2.txt",
  "pa-s3": "PAPartyTop5-S3.txt",
  "pa-s4": "PAPartyTop5-S4.txt",
  "pa-s5": "PAPartyTop5-S5.txt",
  "pa-s6": "PAPartyTop5-S6.txt",
  "pa-s7": "PAPartyTop5-S7.txt",
  // Voter turnout
  "turnout": "VoterTurnout.txt",
};

// Dynamic routes that require additional parameters
const DYNAMIC_ROUTES: Record<string, (params: URLSearchParams) => string | null> = {
  "hor-fptp-cand": (p) => {
    const dist = p.get("dist");
    const cnst = p.get("const");
    return dist && cnst ? `JSONFiles/Election2082/HOR/FPTP/HOR-${dist}-${cnst}.json` : null;
  },
  "hor-pr-cand": (p) => {
    const dist = p.get("dist");
    const cnst = p.get("const");
    return dist && cnst ? `JSONFiles/Election2082/HOR/PR/HOR/HOR-${dist}-${cnst}.json` : null;
  },
  "pr-province": (p) => {
    const id = p.get("dist");
    return id ? `JSONFiles/Election2082/HOR/PR/Province/${id}.json` : null;
  },
  "pr-district": (p) => {
    const id = p.get("dist");
    return id ? `JSONFiles/Election2082/HOR/PR/District/${id}.json` : null;
  },
  "pa-fptp-cand": (p) => {
    const dist = p.get("dist");
    const fc = p.get("const");
    const pc = p.get("pconst");
    return dist && fc && pc ? `JSONFiles/Election2082/PA/FPTP/PA-${dist}-${fc}-${pc}.json` : null;
  },
  "lookup-states": () => `JSONFiles/Election2082/Local/Lookup/states.json`,
  "lookup-districts": () => `JSONFiles/Election2082/Local/Lookup/districts.json`,
  "lookup-constituencies": () => `JSONFiles/Election2082/HOR/Lookup/constituencies.json`,
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
 * GET /api/ec-proxy?type=pr                        → PR vote data (static)
 * GET /api/ec-proxy?type=fptp                      → FPTP seat data (static)
 * GET /api/ec-proxy?type=hor-fptp-cand&dist=15&const=4 → per-constituency candidates (dynamic)
 * GET /api/ec-proxy?type=lookup-states             → lookup data (dynamic)
 */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "pr";

  // Try static files first
  let filePath: string | null | undefined = VALID_FILES[type];

  // Try dynamic routes
  if (!filePath) {
    const dynamicRoute = DYNAMIC_ROUTES[type];
    if (dynamicRoute) {
      filePath = dynamicRoute(request.nextUrl.searchParams);
      if (!filePath) {
        return NextResponse.json(
          { error: `Missing required parameters for type '${type}'` },
          { status: 400 }
        );
      }
    }
  }

  if (!filePath) {
    return NextResponse.json(
      { error: `Invalid type. Static: ${Object.keys(VALID_FILES).join(", ")}. Dynamic: ${Object.keys(DYNAMIC_ROUTES).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const session = await getSession();
    const url = filePath.startsWith("JSONFiles/")
      ? `${EC_JSON}?file=${filePath}`
      : `${EC_JSON}?file=JSONFiles/Election2082/Common/${filePath}`;

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
        const retryUrl = filePath.startsWith("JSONFiles/")
          ? `${EC_JSON}?file=${filePath}`
          : `${EC_JSON}?file=JSONFiles/Election2082/Common/${filePath}`;
        const retry = await fetch(retryUrl, {
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
          { type, file: filePath, data, lastFetched: new Date().toISOString() },
          { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
        );
      }

      const data = await res.json();
      return NextResponse.json(
        { type, file: filePath, data, lastFetched: new Date().toISOString() },
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
