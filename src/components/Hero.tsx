"use client";

import { useLang } from "./LangProvider";
import LangToggle from "./LangToggle";
import { t } from "@/lib/i18n";

export default function Hero() {
  const { lang } = useLang();

  return (
    <header className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-br from-cream via-cream-dark to-[#EDCFB5] overflow-hidden">
      <div className="absolute -top-16 -right-20 w-72 h-72 rounded-full bg-terracotta/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-16 w-52 h-52 rounded-full bg-sage/10 blur-2xl pointer-events-none" />

      <div className="flex justify-end mb-4 relative z-10">
        <LangToggle />
      </div>

      <span
        className="text-5xl block mb-2 animate-bounce"
        style={{ animationDuration: "3s" }}
      >
        🍽️
      </span>
      <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl md:text-5xl text-charcoal tracking-tight leading-tight mb-2">
        Flavor<span className="text-terracotta italic">Map</span>
      </h1>
      <p className="text-warm-gray text-sm md:text-base max-w-lg mx-auto font-light">
        {t(lang, "heroSub")}
      </p>
    </header>
  );
}
