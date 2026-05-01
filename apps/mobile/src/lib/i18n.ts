import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "@/locales/en.json";

// Phase 3 will add `th`. For now we only ship English but the architecture is
// fluent in the locale concept so adding Thai is just a JSON import.
const resources = {
  en: { translation: en },
};

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLocale in resources ? deviceLocale : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
