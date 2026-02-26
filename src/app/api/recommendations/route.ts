import { NextRequest, NextResponse } from "next/server";

const MEAL_API = "https://www.themealdb.com/api/json/v1/1";

/* ── Country Code → TheMealDB area mapping ──
 * TheMealDB areas: American, Argentinian, Australian, British, Canadian,
 * Chinese, Croatian, Dutch, Egyptian, Filipino, French, Greek, Indian,
 * Irish, Italian, Jamaican, Japanese, Kenyan, Malaysian, Mexican,
 * Moroccan, Norwegian, Polish, Portuguese, Russian, Saudi Arabian,
 * Slovakian, Spanish, Syrian, Thai, Tunisian, Turkish, Ukrainian,
 * Uruguayan, Venezulan, Vietnamese
 */
const COUNTRY_TO_AREA: Record<string, string[]> = {
  // Exact matches
  US: ["American"],
  AR: ["Argentinian"],
  AU: ["Australian"],
  GB: ["British"],
  CA: ["Canadian"],
  CN: ["Chinese"],
  HR: ["Croatian"],
  NL: ["Dutch"],
  EG: ["Egyptian"],
  PH: ["Filipino"],
  FR: ["French"],
  GR: ["Greek"],
  IN: ["Indian"],
  IE: ["Irish"],
  IT: ["Italian"],
  JM: ["Jamaican"],
  JP: ["Japanese"],
  KE: ["Kenyan"],
  MY: ["Malaysian"],
  MX: ["Mexican"],
  MA: ["Moroccan"],
  NO: ["Norwegian"],
  PL: ["Polish"],
  PT: ["Portuguese"],
  RU: ["Russian"],
  SA: ["Saudi Arabian"],
  SK: ["Slovakian"],
  ES: ["Spanish"],
  SY: ["Syrian"],
  TH: ["Thai"],
  TN: ["Tunisian"],
  TR: ["Turkish"],
  UA: ["Ukrainian"],
  UY: ["Uruguayan"],
  VE: ["Venezulan"], // TheMealDB typo — keep as-is
  VN: ["Vietnamese"],

  // Balkans → Croatian (closest match)
  RS: ["Croatian", "Turkish", "Greek"],
  BA: ["Croatian", "Turkish"],
  ME: ["Croatian", "Greek"],
  MK: ["Croatian", "Turkish", "Greek"],
  SI: ["Croatian"],
  AL: ["Croatian", "Greek", "Turkish"],
  XK: ["Croatian", "Turkish"],

  // DACH
  DE: ["Dutch", "French", "Polish"],
  AT: ["Dutch", "Croatian", "Polish"],
  CH: ["French", "Italian", "Dutch"],

  // Nordics
  SE: ["Norwegian", "British"],
  DK: ["Norwegian", "Dutch"],
  FI: ["Norwegian", "Russian"],
  IS: ["Norwegian", "British"],

  // Other European
  BE: ["Dutch", "French"],
  LU: ["French", "Dutch"],
  CZ: ["Slovakian", "Polish"],
  HU: ["Croatian", "Polish"],
  RO: ["Croatian", "Turkish", "Greek"],
  BG: ["Turkish", "Greek", "Croatian"],
  LT: ["Polish", "Russian"],
  LV: ["Polish", "Russian"],
  EE: ["Russian", "Norwegian"],

  // Middle East
  LB: ["Syrian", "Turkish"],
  JO: ["Syrian", "Egyptian"],
  IQ: ["Turkish", "Syrian"],
  IR: ["Turkish", "Indian"],
  AE: ["Saudi Arabian", "Indian"],
  QA: ["Saudi Arabian", "Indian"],
  KW: ["Saudi Arabian", "Syrian"],
  BH: ["Saudi Arabian"],
  OM: ["Saudi Arabian", "Indian"],
  YE: ["Saudi Arabian", "Egyptian"],
  PS: ["Syrian", "Egyptian"],

  // Africa
  NG: ["Kenyan", "Moroccan"],
  GH: ["Kenyan"],
  ZA: ["Kenyan", "Indian", "British"],
  ET: ["Kenyan"],
  TZ: ["Kenyan", "Indian"],
  LY: ["Tunisian", "Egyptian"],
  DZ: ["Moroccan", "Tunisian"],

  // Americas
  BR: ["Argentinian", "Portuguese"],
  CO: ["Mexican", "Venezulan"],
  CL: ["Argentinian", "Mexican"],
  PE: ["Mexican", "Argentinian"],
  PR: ["Jamaican", "Mexican"],
  CU: ["Jamaican", "Mexican"],

  // Asia
  KR: ["Japanese", "Chinese"],
  TW: ["Chinese", "Japanese"],
  HK: ["Chinese"],
  SG: ["Malaysian", "Chinese", "Indian"],
  ID: ["Malaysian", "Indian"],
  PK: ["Indian"],
  BD: ["Indian"],
  LK: ["Indian"],
  NP: ["Indian"],
  MM: ["Thai", "Indian"],
  KH: ["Thai", "Vietnamese"],
  LA: ["Thai", "Vietnamese"],

  // Oceania
  NZ: ["Australian", "British"],
};

const DEFAULT_AREAS = ["Italian", "Mexican", "Indian", "Chinese"];

interface GeoResponse {
  countryCode?: string;
  country_code?: string;
  status?: string;
}

async function getCountryCode(ip: string): Promise<string | null> {
  // Primary: ip-api.com (HTTP — fine server-side, no key needed)
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (res.ok) {
      const data: GeoResponse = await res.json();
      if (data.status === "success" && data.countryCode) {
        return data.countryCode;
      }
    }
  } catch {
    /* fallback */
  }

  // Fallback: ipapi.co (HTTPS, 1k/day limit)
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data: GeoResponse = await res.json();
      if (data.country_code) return data.country_code;
    }
  } catch {
    /* give up */
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Get client IP from Vercel/proxy headers
    const forwarded = req.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    // Skip private/local IPs
    const isPrivate =
      !ip ||
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.");

    let countryCode: string | null = null;
    if (!isPrivate) {
      countryCode = await getCountryCode(ip);
    }

    // Map country to TheMealDB areas
    const areas = countryCode
      ? COUNTRY_TO_AREA[countryCode] || DEFAULT_AREAS
      : DEFAULT_AREAS;

    // Fetch meals from matching areas (up to 6 total)
    let meals: { idMeal: string; strMeal: string; strMealThumb: string }[] =
      [];

    for (const area of areas) {
      if (meals.length >= 6) break;
      try {
        const res = await fetch(
          `${MEAL_API}/filter.php?a=${encodeURIComponent(area)}`,
          { next: { revalidate: 86400 } },
        );
        const data = await res.json();
        if (data.meals) {
          // Shuffle for variety, pick what we need
          const shuffled = data.meals.sort(() => Math.random() - 0.5);
          const needed = 6 - meals.length;
          meals.push(
            ...shuffled.slice(0, needed).map(
              (m: { idMeal: string; strMeal: string; strMealThumb: string }) => ({
                idMeal: m.idMeal,
                strMeal: m.strMeal,
                strMealThumb: m.strMealThumb,
              }),
            ),
          );
        }
      } catch {
        /* skip this area */
      }
    }

    return NextResponse.json({
      meals: meals.slice(0, 6),
      countryCode,
      areas: areas.slice(0, 2),
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    // Graceful fallback: popular Italian dishes
    try {
      const res = await fetch(`${MEAL_API}/filter.php?a=Italian`, {
        next: { revalidate: 86400 },
      });
      const data = await res.json();
      const shuffled = (data.meals || []).sort(() => Math.random() - 0.5);
      return NextResponse.json({
        meals: shuffled.slice(0, 6),
        countryCode: null,
        areas: ["Italian"],
      });
    } catch {
      return NextResponse.json({ meals: [], countryCode: null, areas: [] });
    }
  }
}
