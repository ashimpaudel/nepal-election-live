import { AlertTriangle, ExternalLink } from "lucide-react";

const ECN_RESULTS_URL = "https://result.election.gov.np";

export default function DisclaimerFooter() {
  return (
    <footer className="glass border-t border-yellow-900/30 mt-6">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-400">
              ⚠️ Unofficial Results — अनधिकृत नतिजा
            </p>
            <p className="text-xs text-gray-400 mt-1">
              The data shown on this dashboard is aggregated from publicly
              available sources and may be delayed or inaccurate. This is{" "}
              <strong className="text-yellow-300">NOT</strong> an official
              government portal.
            </p>
            <a
              href={ECN_RESULTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              View Official ECN Results Portal
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-600 mt-3">
          © {new Date().getFullYear()} Nepal Election LIVE Dashboard •
          Open-source under GPLv3
        </p>
      </div>
    </footer>
  );
}
