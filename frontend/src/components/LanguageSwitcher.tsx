"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export default function LanguageSwitcher({
  currentLocale,
  onLocaleChange,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors text-sm text-gray-300"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{localeNames[currentLocale]}</span>
        <span className="sm:hidden">{currentLocale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 glass-card rounded-xl border border-gray-700/50 overflow-hidden z-50 shadow-xl">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => {
                onLocaleChange(locale);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                currentLocale === locale
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <span className="font-medium">{localeNames[locale]}</span>
              <span className="text-gray-500 text-xs ml-2">
                {locale.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
