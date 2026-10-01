// Shared reference lists for profile fields.

export type Country = { code: string; name: string; dial: string };

// Philippines first (default). Extend as needed.
export const COUNTRIES: Country[] = [
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "DE", name: "Germany", dial: "+49" },
];

export const DEFAULT_COUNTRY = "PH";

// Personal title / honorific for profiles.
export const TITLES: string[] = [
  "Mr.",
  "Ms.",
  "Mrs.",
  "Mx.",
  "Dr.",
  "Rev.",
  "Fr.",
  "Sr.",
  "Bro.",
  "Deacon",
  "Bishop",
  "Msgr.",
];

export function dialFor(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.dial ?? "";
}

// Dioceses now live in the `dioceses` table (migration 0012) — loaded server-side
// and passed into the profile form, so there is no hardcoded list here.
