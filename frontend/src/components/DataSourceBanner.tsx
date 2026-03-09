interface DataSourceBannerProps {
  sources: { name: string; url: string }[];
}

export default function DataSourceBanner({ sources }: DataSourceBannerProps) {
  return (
    <div className="bg-gray-800/30 border border-gray-700 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">📊 Data Sources:</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            {source.name}
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
