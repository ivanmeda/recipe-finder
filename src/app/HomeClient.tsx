"use client";

import { LangProvider } from "@/components/LangProvider";
import QueryProvider from "@/components/QueryProvider";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import AiSearch from "@/components/AiSearch";
import Recommendations from "@/components/Recommendations";
import CategoryGrid from "@/components/CategoryGrid";
import RecipeList from "@/components/RecipeList";
import type { Category, MealSummary } from "@/lib/api";

interface Props {
  categories: Category[];
  meals: MealSummary[] | null;
  mode: "categories" | "category" | "search";
  label: string;
}

export default function HomeClient({ categories, meals, mode, label }: Props) {
  return (
    <QueryProvider>
      <LangProvider>
        <Hero />

        {mode === "categories" && (
          <>
            <SearchBar />
            <AiSearch />
            <Recommendations />
            <CategoryGrid categories={categories} />
          </>
        )}

        {mode === "category" && meals && (
          <RecipeList
            label={label}
            backHref="/"
            backLabel="backCategories"
            meals={meals}
          />
        )}

        {mode === "search" && meals && (
          <RecipeList
            label={label}
            backHref="/"
            backLabel="backCategories"
            meals={meals}
            isSearch
          />
        )}
      </LangProvider>
    </QueryProvider>
  );
}
