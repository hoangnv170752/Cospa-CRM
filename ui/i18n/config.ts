export const locales = ["en", "zh", "fr", "es", "vi", "tr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
  fr: "Français",
  es: "Español",
  vi: "Tiếng Việt",
  tr: "Türkçe",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  zh: "🇨🇳",
  fr: "🇫🇷",
  es: "🇪🇸",
  vi: "🇻🇳",
  tr: "🇹🇷",
};
