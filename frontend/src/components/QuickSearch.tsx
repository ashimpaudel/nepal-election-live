"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Users, X, ChevronRight } from "lucide-react";

interface QuickSearchProps {
  constituencies: Array<{
    id: number;
    name: string;
    province: string;
    status: "declared" | "counting" | "pending";
    totalVotes: number;
    candidates: Array<{
      name: string;
      party: string;
      partyShort: string;
      votes: number;
      color: string;
    }>;
  }>;
}

interface SearchItem {
  type: "constituency" | "candidate";
  id: number;
  name: string;
  detail: string;
  status?: "declared" | "counting" | "pending";
  totalVotes?: number;
  color?: string;
  votes?: number;
  isWinner?: boolean;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-white font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    declared: "bg-emerald-500/20 text-emerald-400",
    counting: "bg-amber-500/20 text-amber-400",
    pending: "bg-gray-500/20 text-gray-400",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

export default function QuickSearch({ constituencies }: QuickSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build flat searchable index from constituencies
  const searchIndex = useMemo(() => {
    const items: SearchItem[] = [];
    constituencies.forEach((c) => {
      items.push({
        type: "constituency",
        id: c.id,
        name: c.name,
        detail: c.province,
        status: c.status,
        totalVotes: c.totalVotes,
      });
      const maxVotes = c.candidates.length > 0 ? Math.max(...c.candidates.map((x) => x.votes)) : 0;
      c.candidates.forEach((cand) => {
        items.push({
          type: "candidate",
          id: c.id,
          name: cand.name,
          detail: `${c.name} • ${cand.partyShort}`,
          color: cand.color,
          votes: cand.votes,
          isWinner: cand.votes === maxVotes && maxVotes > 0 && c.status === "declared",
        });
      });
    });
    return items;
  }, [constituencies]);

  // Filter results based on query
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { constituencies: [], candidates: [] };

    const matchedConstituencies: SearchItem[] = [];
    const matchedCandidates: SearchItem[] = [];

    for (const item of searchIndex) {
      if (item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)) {
        if (item.type === "constituency") {
          matchedConstituencies.push(item);
        } else {
          matchedCandidates.push(item);
        }
      }
    }

    return {
      constituencies: matchedConstituencies.slice(0, 10),
      candidates: matchedCandidates.slice(0, 15),
    };
  }, [query, searchIndex]);

  const flatResults = useMemo(
    () => [...results.constituencies, ...results.candidates],
    [results],
  );

  const totalResults = flatResults.length;
  const hasResults = totalResults > 0;
  const showDropdown = isOpen && query.trim().length > 0;

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navigate = useCallback(
    (item: SearchItem) => {
      setIsOpen(false);
      setQuery("");
      router.push(`/constituency/${item.id}`);
    },
    [router],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || !hasResults) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % totalResults);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + totalResults) % totalResults);
        break;
      case "Enter":
        e.preventDefault();
        if (flatResults[activeIndex]) navigate(flatResults[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  function renderItem(item: SearchItem, index: number) {
    const isActive = index === activeIndex;
    const isConstituency = item.type === "constituency";

    return (
      <button
        key={`${item.type}-${item.id}-${item.name}-${index}`}
        data-index={index}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-lg ${
          isActive ? "bg-white/10" : "hover:bg-white/5"
        }`}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => navigate(item)}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: isConstituency ? "rgba(99,102,241,0.15)" : `${item.color}20`,
          }}
        >
          {isConstituency ? (
            <MapPin size={14} className="text-indigo-400" />
          ) : (
            <Users size={14} style={{ color: item.color }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 truncate">
            {highlightMatch(item.name, query)}
            {item.isWinner && (
              <span className="ml-1.5 text-[10px] uppercase tracking-wider font-semibold text-emerald-400">
                ✓ Winner
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {highlightMatch(item.detail, query)}
          </div>
        </div>

        {/* Right side info */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {isConstituency && item.status && <StatusBadge status={item.status} />}
          {!isConstituency && item.votes !== undefined && (
            <span className="text-xs text-gray-500 tabular-nums">
              {item.votes.toLocaleString()} votes
            </span>
          )}
          <ChevronRight size={14} className="text-gray-600" />
        </div>
      </button>
    );
  }

  let globalIndex = 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search constituencies, candidates..."
          className="w-full pl-10 pr-10 py-3 rounded-xl glass text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/30 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 rounded-xl glass-card overflow-hidden shadow-2xl">
          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-1.5">
            {!hasResults ? (
              <div className="px-4 py-8 text-center">
                <Search size={24} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Try a constituency name, district, or candidate
                </p>
              </div>
            ) : (
              <>
                {results.constituencies.length > 0 && (
                  <div>
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                      Constituencies
                    </div>
                    {results.constituencies.map((item) => {
                      const idx = globalIndex++;
                      return renderItem(item, idx);
                    })}
                  </div>
                )}
                {results.candidates.length > 0 && (
                  <div>
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                      Candidates
                    </div>
                    {results.candidates.map((item) => {
                      const idx = globalIndex++;
                      return renderItem(item, idx);
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer hint */}
          {hasResults && (
            <div className="border-t border-white/5 px-3 py-2 flex items-center gap-3 text-[10px] text-gray-600">
              <span>
                <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">↵</kbd> select
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">esc</kbd> close
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
