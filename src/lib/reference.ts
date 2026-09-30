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

export function dialFor(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.dial ?? "";
}

// Placeholder diocese list — replace with the client's official list later.
export const DIOCESES: string[] = [
  "Archdiocese of Manila",
  "Archdiocese of Cebu",
  "Archdiocese of Davao",
  "Archdiocese of Lipa",
  "Archdiocese of Nueva Segovia",
  "Diocese of Cubao",
  "Diocese of Novaliches",
  "Diocese of Kalookan",
  "Diocese of Antipolo",
  "Diocese of Parañaque",
  "Other",
];
