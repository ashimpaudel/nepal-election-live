import { ExternalLink, Database } from "lucide-react";

interface DataSourceBannerProps {
  sources: { name: string; url: string }[];
}

export default function DataSourceBanner({ sources }: DataSourceBannerProps) {
  return (
    <div className="glass-card rounded-2xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
        <Database className="w-3 h-3" />
        Data Sources:
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1"
          >
            {source.name}
            <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-1">
        Results shown are for demonstration. Visit sources above for official
        live data.
      </p>
    </div>
  );
}
