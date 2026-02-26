"use client";

import { LangProvider } from "@/components/LangProvider";
import Hero from "@/components/Hero";
import RecipeDetail from "@/components/RecipeDetail";
import type { MealDetail } from "@/lib/api";

interface Props {
  meal: MealDetail;
}

export default function RecipePageClient({ meal }: Props) {
  return (
    <LangProvider>
      <Hero />
      <RecipeDetail meal={meal} />
    </LangProvider>
  );
}
