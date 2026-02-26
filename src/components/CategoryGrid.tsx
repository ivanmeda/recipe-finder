"use client";

import Link from "next/link";
import Image from "next/image";
import { useLang } from "./LangProvider";
import { CATEGORY_EMOJI, categoryName, t } from "@/lib/i18n";
import type { Category } from "@/lib/api";

interface Props {
  categories: Category[];
}

export default function CategoryGrid({ categories }: Props) {
  const { lang } = useLang();

  return (
    <section className="pb-10">
      <h2 className="font-[family-name:var(--font-display)] font-bold text-xl md:text-2xl text-center pt-5 pb-1 text-charcoal">
        {t(lang, "browseCategories")}
      </h2>
      <p className="text-center text-warm-gray text-sm mb-5 font-light">
        {t(lang, "browseSub")}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 max-w-4xl mx-auto">
        {categories.map((cat, i) => (
          <Link
            key={cat.idCategory}
            href={`/?category=${encodeURIComponent(cat.strCategory)}`}
            className="group relative bg-card rounded-2xl overflow-hidden border-2 border-transparent
              shadow-[0_4px_24px_rgba(45,42,38,.10)] hover:border-terracotta hover:-translate-y-1
              hover:shadow-[0_12px_48px_rgba(45,42,38,.18)] transition-all duration-300"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* top gradient bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-terracotta to-gold
              scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10"
            />
            {/* category image */}
            <div className="relative w-full h-24 overflow-hidden bg-cream-dark/30">
              <Image
                src={cat.strCategoryThumb}
                alt={cat.strCategory}
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                className="object-contain p-2 group-hover:scale-110 transition-transform duration-400"
              />
            </div>
            {/* label */}
            <div className="p-3 text-center">
              <span className="text-lg block mb-0.5">
                {CATEGORY_EMOJI[cat.strCategory] || "🍴"}
              </span>
              <span className="font-[family-name:var(--font-display)] font-semibold text-sm text-charcoal">
                {categoryName(lang, cat.strCategory)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
