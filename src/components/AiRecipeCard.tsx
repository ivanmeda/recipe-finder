"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";

export interface AiGeneratedRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  area: string;
  ingredients: { name: string; measure: string }[];
  instructions: string[];
  prepTime: string;
  servings: string;
  isAiGenerated: true;
}

interface AiRecipeCardProps {
  recipe: AiGeneratedRecipe;
  lang: Lang;
}

export default function AiRecipeCard({ recipe, lang }: AiRecipeCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(45,42,38,.10)] border border-gold/20">
      {/* Gradient header with AI badge */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-terracotta/10 via-gold/10 to-sage/10 px-5 py-4
          flex items-center justify-between cursor-pointer hover:from-terracotta/15 hover:via-gold/15
          hover:to-sage/15 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Styled placeholder icon */}
          <div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-terracotta to-gold
            flex items-center justify-center flex-shrink-0"
          >
            <span className="text-xl">🍽️</span>
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[0.62rem] font-bold uppercase tracking-widest text-white
                bg-gradient-to-r from-terracotta to-gold px-2 py-0.5 rounded-full flex items-center gap-1"
              >
                🧠 {lang === "sr" ? "AI Recept" : "AI Recipe"}
              </span>
            </div>
            <h4 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal leading-tight">
              {recipe.name}
            </h4>
            <p className="text-warm-gray text-xs font-light mt-0.5">
              {recipe.description}
            </p>
          </div>
        </div>

        <span
          className={`text-warm-gray text-lg transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-5 border-t border-gold/10">
          {/* Meta pills */}
          <div className="flex gap-2 flex-wrap mb-5">
            <span className="text-xs bg-sage/10 text-olive px-2.5 py-1 rounded-full font-medium">
              🌍 {recipe.area}
            </span>
            {recipe.prepTime && (
              <span className="text-xs bg-sage/10 text-olive px-2.5 py-1 rounded-full font-medium">
                ⏱️ {recipe.prepTime}
              </span>
            )}
            {recipe.servings && (
              <span className="text-xs bg-sage/10 text-olive px-2.5 py-1 rounded-full font-medium">
                🍽️ {recipe.servings}{" "}
                {lang === "sr" ? "porcija" : "servings"}
              </span>
            )}
            {recipe.category && (
              <span className="text-xs bg-terracotta/10 text-terracotta px-2.5 py-1 rounded-full font-medium">
                📂 {recipe.category}
              </span>
            )}
          </div>

          {/* Ingredients */}
          <h5 className="font-[family-name:var(--font-display)] font-semibold text-sm text-charcoal mb-3">
            {lang === "sr" ? "Sastojci" : "Ingredients"}
          </h5>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-5">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="text-sm text-warm-gray flex items-start gap-2"
              >
                <span className="text-terracotta mt-0.5">•</span>
                <span>
                  <strong className="text-charcoal font-medium">
                    {ing.measure}
                  </strong>{" "}
                  {ing.name}
                </span>
              </li>
            ))}
          </ul>

          {/* Instructions */}
          <h5 className="font-[family-name:var(--font-display)] font-semibold text-sm text-charcoal mb-3">
            {lang === "sr" ? "Priprema" : "Instructions"}
          </h5>
          <ol className="space-y-3">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-terracotta to-gold
                  text-white font-bold text-xs flex items-center justify-center mt-0.5"
                >
                  {i + 1}
                </span>
                <span className="text-warm-gray leading-relaxed">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
