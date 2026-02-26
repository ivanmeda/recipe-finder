"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "./LangProvider";
import { t } from "@/lib/i18n";
import AiRecipeCard from "./AiRecipeCard";
import type { AiGeneratedRecipe } from "./AiRecipeCard";

interface AiMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strMealTranslated?: string;
}

export default function AiSearch() {
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AiMeal[] | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [aiRecipe, setAiRecipe] = useState<AiGeneratedRecipe | null>(null);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setResults(null);
    setTranslations({});
    setMessage("");
    setTerms([]);
    setAiRecipe(null);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, lang }),
      });

      if (!res.ok) throw new Error("fail");

      const data = await res.json();
      setResults(data.meals || []);
      setTranslations(data.translations || {});
      setMessage(data.message || "");
      setTerms(data.searchTerms || []);
      setAiRecipe(data.aiGenerated || null);
    } catch {
      setMessage(t(lang, "aiError"));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /** Get display name — use strMealTranslated if SR, fall back to translations map, then original */
  const displayName = (meal: AiMeal): string => {
    if (lang === "sr") {
      return meal.strMealTranslated || translations[meal.strMeal] || meal.strMeal;
    }
    return meal.strMeal;
  };

  return (
    <section className="max-w-4xl mx-auto px-4 pb-8">
      <div className="bg-gradient-to-br from-terracotta/5 via-gold/5 to-sage/5 rounded-3xl p-6 border border-terracotta/10">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal mb-1">
          {t(lang, "aiTitle")}
        </h3>
        <p className="text-warm-gray text-xs mb-4 font-light">
          {t(lang, "aiSub")}
        </p>

        <form onSubmit={handleAiSearch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">
              🤖
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, "aiPlaceholder")}
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/80 border-2 border-transparent
                text-charcoal placeholder-warm-gray/50 focus:border-terracotta focus:outline-none
                transition-all text-sm font-light disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-terracotta text-white rounded-xl font-semibold text-sm
              hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "✨"
            )}
            {loading
              ? lang === "sr"
                ? "Tražim..."
                : "Searching..."
              : lang === "sr"
                ? "Traži"
                : "Search"}
          </button>
        </form>

        {/* AI thinking */}
        {loading && (
          <div className="mt-4 flex items-center gap-2 text-warm-gray text-sm">
            <span className="animate-pulse">🧠</span>
            {t(lang, "aiSearching")}
          </div>
        )}

        {/* AI message + search terms */}
        {message && !loading && (
          <div className="mt-4">
            <p className="text-charcoal text-sm font-medium mb-2">
              {message}
            </p>
            {terms.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {terms.map((term) => (
                  <span
                    key={term}
                    className="text-[0.68rem] font-semibold uppercase tracking-wider text-terracotta
                      bg-terracotta/10 px-2.5 py-0.5 rounded-full"
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TheMealDB results (with translated names when SR) */}
        {results && results.length > 0 && !loading && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map((meal) => (
              <Link
                key={meal.idMeal}
                href={`/recipe/${meal.idMeal}`}
                className="group bg-white rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(45,42,38,.08)]
                  hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(45,42,38,.15)] transition-all duration-300"
              >
                <div className="relative w-full h-28 overflow-hidden">
                  <Image
                    src={meal.strMealThumb}
                    alt={displayName(meal)}
                    fill
                    sizes="(max-width: 640px) 50vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <h4 className="font-[family-name:var(--font-display)] font-semibold text-xs text-charcoal leading-snug line-clamp-2">
                    {displayName(meal)}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* AI-Generated recipe card (fallback when TheMealDB < 3 results) */}
        {aiRecipe && !loading && (
          <AiRecipeCard recipe={aiRecipe} lang={lang} />
        )}

        {/* No results at all */}
        {results &&
          results.length === 0 &&
          !aiRecipe &&
          !loading && (
            <div className="mt-4 text-center text-warm-gray text-sm py-4">
              <span className="text-3xl block mb-1">🍳</span>
              {t(lang, "noRecipes")}
            </div>
          )}
      </div>
    </section>
  );
}
