import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import cs from "./locales/cs/translation.json";
import en from "./locales/en/translation.json";

const resources = {
  cs: { translation: cs },
  en: { translation: en },
};

const LANGUAGE_KEY = "app_language";

export const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  if (!savedLanguage) {
    // Default to Czech, or try to guess from device
    const deviceLocales = Localization.getLocales();
    if (deviceLocales && deviceLocales.length > 0) {
      savedLanguage = deviceLocales[0].languageCode === "cs" ? "cs" : "en";
    } else {
      savedLanguage = "cs";
    }
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage,
    fallbackLng: "cs",
    interpolation: {
      escapeValue: false,
    },
  });

  return i18n;
};

export const changeLanguage = async (lng: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  await i18n.changeLanguage(lng);
};

export default i18n;
