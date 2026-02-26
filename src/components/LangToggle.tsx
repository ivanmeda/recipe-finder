"use client";

import { useLang } from "./LangProvider";

export default function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex rounded-full overflow-hidden border border-charcoal/10 bg-charcoal/5">
      <button
        onClick={() => setLang("en")}
        className={`px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
          lang === "en"
            ? "bg-terracotta text-white rounded-full"
            : "text-warm-gray hover:text-charcoal"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("sr")}
        className={`px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
          lang === "sr"
            ? "bg-terracotta text-white rounded-full"
            : "text-warm-gray hover:text-charcoal"
        }`}
      >
        SR
      </button>
    </div>
  );
}
