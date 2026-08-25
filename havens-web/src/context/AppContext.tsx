import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Language,
  TranslationDictionary,
  TRANSLATIONS,
} from '../i18n/translations';

export type { Language, TranslationDictionary };

export interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDictionary) => string;
}

const defaultContextValue: AppContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key: keyof TranslationDictionary) => TRANSLATIONS.en?.[key] || key,
};

export const AppContext = createContext<AppContextType>(defaultContextValue);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('havens_lang');
      if (saved === 'en' || saved === 'es' || saved === 'fr') {
        return saved;
      }
    } catch {
      // Fallback in case localStorage is restricted
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem('havens_lang', language);
    } catch {
      // Ignored
    }
  }, [language]);

  // Clear theme from localStorage and root DOM if previously set
  useEffect(() => {
    try {
      localStorage.removeItem('havens_theme');
    } catch {
      // Ignored
    }
    document.documentElement.classList.remove('dark');
  }, []);

  const t = (key: keyof TranslationDictionary): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en?.[key] || key;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  return context || defaultContextValue;
};

export default AppContextProvider;
