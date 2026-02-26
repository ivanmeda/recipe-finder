"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "./LangProvider";
import { categoryName, t } from "@/lib/i18n";
import {
  extractIngredients,
  extractSteps,
  getYoutubeId,
  type MealDetail,
} from "@/lib/api";

interface Props {
  meal: MealDetail;
}

export default function RecipeDetail({ meal }: Props) {
  const { lang } = useLang();
  const ingredients = extractIngredients(meal);
  const steps = extractSteps(meal.strInstructions || "");
  const ytId = getYoutubeId(meal.strYoutube);

  return (
    <section className="pb-16">
      {/* back */}
      <Link
        href={
          meal.strCategory
            ? `/?category=${encodeURIComponent(meal.strCategory)}`
            : "/"
        }
        className="flex items-center gap-2 px-5 pt-4 pb-2 max-w-3xl mx-auto group"
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
          {t(lang, "backRecipes")}
        </span>
      </Link>

      {/* hero image */}
      <div className="relative w-full h-60 sm:h-72 md:h-96 overflow-hidden">
        <Image
          src={meal.strMealThumb}
          alt={meal.strMeal}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-cream/95 to-transparent pointer-events-none" />
      </div>

      {/* content */}
      <div className="max-w-3xl mx-auto px-5 -mt-8 relative z-10">
        <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl md:text-4xl text-charcoal leading-tight mb-3">
          {meal.strMeal}
        </h1>

        {/* tags */}
        <div className="flex gap-2 flex-wrap mb-6">
          {meal.strCategory && (
            <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
              {categoryName(lang, meal.strCategory)}
            </span>
          )}
          {meal.strArea && (
            <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-sage bg-sage/10 px-3 py-1 rounded-full">
              {meal.strArea}
            </span>
          )}
        </div>

        {/* Ingredients */}
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal mt-6 mb-3 flex items-center gap-2">
          <span>🥘</span> {t(lang, "ingredients")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ingredients.map((ing) => (
            <div
              key={ing.name}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gold/5 text-sm"
            >
              <Image
                src={ing.image}
                alt={ing.name}
                width={32}
                height={32}
                className="rounded-md flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div>
                <strong>{ing.name}</strong>
                {ing.measure && (
                  <span className="block text-warm-gray text-xs">
                    {ing.measure}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal mt-8 mb-3 flex items-center gap-2">
          <span>👩‍🍳</span> {t(lang, "instructions")}
        </h2>
        <ol className="list-none" style={{ counterReset: "step" }}>
          {steps.map((step, i) => (
            <li
              key={i}
              className="step-item relative pl-12 py-3 text-sm leading-relaxed border-b border-charcoal/5 last:border-b-0"
            >
              {step}
            </li>
          ))}
        </ol>

        {/* Video */}
        {ytId && (
          <>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal mt-8 mb-3 flex items-center gap-2">
              <span>🎬</span> {t(lang, "video")}
            </h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl shadow-[0_4px_24px_rgba(45,42,38,.10)]">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                allowFullScreen
                loading="lazy"
                className="absolute top-0 left-0 w-full h-full border-none rounded-2xl"
              />
            </div>
          </>
        )}

        {/* Source */}
        {meal.strSource && (
          <a
            href={meal.strSource}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-terracotta text-white rounded-xl
              font-semibold text-sm hover:bg-terracotta-dark transition-colors"
          >
            📖 {t(lang, "sourceBtn")} ↗
          </a>
        )}
      </div>
    </section>
  );
}
