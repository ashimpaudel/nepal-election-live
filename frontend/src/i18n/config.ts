export const locales = ["en", "ne", "mai", "bho", "thr", "tam", "new"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ne: "नेपाली",
  mai: "मैथिली",
  bho: "भोजपुरी",
  thr: "थारु",
  tam: "तामाङ",
  new: "नेवारी",
};

/**
 * Load translation messages for a given locale.
 * Falls back to English for missing keys.
 */
export async function getMessages(locale: string) {
  try {
    return (await import(`./${locale}.json`)).default;
  } catch {
    return (await import("./en.json")).default;
  }
}
