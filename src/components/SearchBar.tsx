"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "./LangProvider";
import { t } from "@/lib/i18n";

export default function SearchBar() {
  const { lang } = useLang();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed) {
        router.push(`/?search=${encodeURIComponent(trimmed)}`);
      }
    },
    [query, router]
  );

  return (
    <form onSubmit={handleSearch} className="max-w-2xl mx-auto px-4 pt-6 pb-2">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-gray"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, "searchPlaceholder")}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card border-2 border-transparent
            shadow-[0_4px_24px_rgba(45,42,38,.08)] text-charcoal placeholder-warm-gray/60
            focus:border-terracotta focus:outline-none transition-all text-sm font-light"
        />
      </div>
    </form>
  );
}
