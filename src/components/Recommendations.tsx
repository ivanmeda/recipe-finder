"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "./LangProvider";

interface RecommendedMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface RecommendationsResponse {
  meals: RecommendedMeal[];
  countryCode: string | null;
  areas: string[];
}

/** Area name translations for display */
const AREA_SR: Record<string, string> = {
  Croatian: "hrvatska",
  Turkish: "turska",
  Greek: "grčka",
  Italian: "italijanska",
  French: "francuska",
  Indian: "indijska",
  Chinese: "kineska",
  Mexican: "meksička",
  American: "američka",
  British: "britanska",
  Japanese: "japanska",
  Thai: "tajlandska",
  Vietnamese: "vijetnamska",
  Polish: "poljska",
  Russian: "ruska",
  Dutch: "holandska",
  Norwegian: "norveška",
  Spanish: "španska",
  Portuguese: "portugalska",
  Moroccan: "marokanska",
  Malaysian: "malezijska",
  Kenyan: "kenijska",
  Egyptian: "egipatska",
  Argentinian: "argentinska",
  Australian: "australska",
  Filipino: "filipinska",
  Irish: "irska",
  Jamaican: "jamajkanska",
  "Saudi Arabian": "saudijska",
  Slovakian: "slovačka",
  Syrian: "sirijska",
  Tunisian: "tuniška",
  Ukrainian: "ukrajinska",
  Uruguayan: "urugvajska",
  Venezulan: "venecuelanska",
  Canadian: "kanadska",
};

async function fetchRecommendations(): Promise<RecommendationsResponse> {
  const res = await fetch("/api/recommendations");
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse"
        >
          <div className="w-full h-28 bg-warm-gray/10" />
          <div className="p-2.5">
            <div className="h-3 bg-warm-gray/10 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Recommendations() {
  const { lang } = useLang();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recommendations"],
    queryFn: fetchRecommendations,
    staleTime: 10 * 60 * 1000, // 10 min — location doesn't change often
    retry: 1,
  });

  // Don't render section if error or no meals
  if (isError) return null;
  if (!isLoading && (!data || data.meals.length === 0)) return null;

  const areas = data?.areas || [];

  // Build subtitle with area name
  const areaDisplay =
    areas.length > 0
      ? lang === "sr"
        ? `${AREA_SR[areas[0]] || areas[0]} kuhinja`
        : `${areas[0]} cuisine`
      : "";

  return (
    <section className="max-w-4xl mx-auto px-4 pb-6">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal flex items-center gap-2">
          <span>📍</span>
          {lang === "sr" ? "Preporučeno za Tebe" : "Recommended for You"}
        </h3>
        {areaDisplay && !isLoading && (
          <p className="text-warm-gray text-xs font-light mt-0.5">
            {lang === "sr"
              ? `Na osnovu tvoje lokacije — ${areaDisplay}`
              : `Based on your location — ${areaDisplay}`}
          </p>
        )}
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data!.meals.map((meal) => (
            <Link
              key={meal.idMeal}
              href={`/recipe/${meal.idMeal}`}
              className="group bg-white rounded-xl overflow-hidden
                shadow-[0_2px_12px_rgba(45,42,38,.08)]
                hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(45,42,38,.15)]
                transition-all duration-300"
            >
              <div className="relative w-full h-28 overflow-hidden">
                <Image
                  src={meal.strMealThumb}
                  alt={meal.strMeal}
                  fill
                  sizes="(max-width: 640px) 50vw, 16vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Location pin badge */}
                <div
                  className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm rounded-full
                  w-6 h-6 flex items-center justify-center shadow-sm"
                >
                  <span className="text-xs">📍</span>
                </div>
              </div>
              <div className="p-2.5">
                <h4 className="font-[family-name:var(--font-display)] font-semibold text-xs text-charcoal leading-snug line-clamp-2">
                  {meal.strMeal}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
