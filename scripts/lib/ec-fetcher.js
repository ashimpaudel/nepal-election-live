/**
 * Shared EC JSON API fetcher with session/CSRF management.
 * Used by scraper scripts to fetch data from the Election Commission.
 *
 * Usage:
 *   const { fetchECData, probeEndpoint } = require('./lib/ec-fetcher');
 *   const data = await fetchECData('HoRPartyTop5.txt');
 */

const fetch = require("node-fetch");
const path = require("path");

const EC_BASE = "https://result.election.gov.np";
const EC_PAGE = `${EC_BASE}/PRVoteChartResult2082.aspx`;
const EC_JSON = `${EC_BASE}/Handlers/SecureJson.ashx`;
const FILE_BASE = "JSONFiles/Election2082/Common";

// Session cache
let cachedSession = null;
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0";

/**
 * Acquire an EC session with cookies and CSRF token.
 */
async function getSession(forceRefresh = false) {
  if (!forceRefresh && cachedSession && Date.now() - cachedSession.ts < SESSION_TTL) {
    return cachedSession;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(EC_PAGE, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
    });

    // Extract cookies from response
    const rawHeaders = res.headers.raw();
    const setCookies = rawHeaders["set-cookie"] || [];
    const cookieStr = setCookies.map((c) => c.split(";")[0]).join("; ");
    const csrfCookie = setCookies.find((c) => c.startsWith("CsrfToken="));
    const csrf = csrfCookie ? csrfCookie.split("=")[1].split(";")[0] : "";

    cachedSession = { cookies: cookieStr, csrf, ts: Date.now() };
    return cachedSession;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch JSON data from the EC API for a given file.
 * @param {string} file - The JSON file name (e.g., "HoRPartyTop5.txt")
 * @param {object} options - { retries: number, retryDelay: number, timeout: number }
 * @returns {Promise<any>} Parsed JSON data
 */
async function fetchECData(file, options = {}) {
  const { retries = 3, retryDelay = 2000, timeout = 10000 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const session = await getSession(attempt > 1); // force refresh on retry
      const filePath = file.startsWith("JSONFiles/") ? file : `${FILE_BASE}/${file}`;
      const url = `${EC_JSON}?file=${filePath}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Cookie: session.cookies,
            "X-CSRF-Token": session.csrf,
            "X-Requested-With": "XMLHttpRequest",
            Referer: EC_PAGE,
            Accept: "application/json",
          },
        });

        if (res.status === 403 || res.status === 401) {
          cachedSession = null; // Invalidate session
          throw new Error(`Auth failed (HTTP ${res.status})`);
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        // Strip UTF-8 BOM (0xEF 0xBB 0xBF) that EC server sometimes sends
        let text = await res.text();
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }
        const data = JSON.parse(text);
        return data;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      const isLast = attempt === retries;
      if (isLast) throw err;

      const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(
        `⚠️  Attempt ${attempt}/${retries} for ${file} failed: ${err.message}. Retrying in ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Probe whether an EC JSON file exists and returns valid data.
 * @param {string} file - The JSON file name to probe
 * @returns {Promise<{ available: boolean, data?: any, error?: string }>}
 */
async function probeEndpoint(file) {
  try {
    const data = await fetchECData(file, { retries: 1, timeout: 8000 });
    const isValid = data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0);
    return { available: isValid, data: isValid ? data : undefined };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

/**
 * Load endpoint config from ec-endpoints.json
 * @returns {object} Parsed endpoint configuration
 */
function loadEndpointConfig() {
  return require(path.join(__dirname, "..", "ec-endpoints.json"));
}

module.exports = {
  fetchECData,
  probeEndpoint,
  getSession,
  loadEndpointConfig,
  EC_BASE,
  EC_PAGE,
  EC_JSON,
  FILE_BASE,
};
