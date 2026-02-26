"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LangProvider";
import { CATEGORY_EMOJI, categoryName, t } from "@/lib/i18n";
import type { MealSummary } from "@/lib/api";

interface Props {
  label: string;
  backHref: string;
  backLabel: "backCategories" | "backRecipes";
  meals: MealSummary[];
  isSearch?: boolean;
}

export default function RecipeList({
  label,
  backHref,
  backLabel,
  meals,
  isSearch,
}: Props) {
  const { lang } = useLang();

  return (
    <section className="pb-10">
      {/* back button */}
      <Link
        href={backHref}
        className="flex items-center gap-2 px-5 pt-4 pb-1 max-w-4xl mx-auto group"
      >
        <svg
          className="w-5 h-5 text-terracotta group-hover:-translate-x-1 transition-transform"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span className="font-[family-name:var(--font-display)] font-semibold text-sm text-terracotta">
          {t(lang, backLabel)}
        </span>
      </Link>

      <h2 className="font-[family-name:var(--font-display)] font-bold text-xl md:text-2xl text-center pt-4 pb-1 text-charcoal">
        {isSearch
          ? `🔍 ${t(lang, "searchResults")}`
          : `${CATEGORY_EMOJI[label] || "🍴"} ${categoryName(lang, label)} ${t(lang, "recipes")}`}
      </h2>
      {!isSearch && (
        <p className="text-center text-warm-gray text-sm mb-5 font-light">
          {t(lang, "showingUp")}
        </p>
      )}
      {isSearch && (
        <p className="text-center text-warm-gray text-sm mb-5 font-light">
          &ldquo;{label}&rdquo;
        </p>
      )}

      {meals.length === 0 ? (
        <div className="text-center py-12 text-warm-gray">
          <span className="text-5xl block mb-2">🍳</span>
          {t(lang, "noRecipes")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 px-4 max-w-4xl mx-auto">
          {meals.map((meal, i) => (
            <Link
              key={meal.idMeal}
              href={`/recipe/${meal.idMeal}`}
              className="group bg-card rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(45,42,38,.10)]
                hover:-translate-y-1 hover:shadow-[0_12px_48px_rgba(45,42,38,.18)] transition-all duration-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative w-full h-48 overflow-hidden">
                <Image
                  src={meal.strMealThumb}
                  alt={meal.strMeal}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-400"
                />
              </div>
              <div className="p-4">
                <h3 className="font-[family-name:var(--font-display)] font-bold text-base text-charcoal leading-snug mb-1">
                  {meal.strMeal}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
