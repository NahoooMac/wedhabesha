import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  currentLanguage: string;
  isRTL: boolean;
  changeLanguage: (language: string) => void;
  availableLanguages: { code: string; name: string; nativeName: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [isRTL, setIsRTL] = useState(false);

  const availableLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' }
  ];

  // RTL languages (Amharic uses Ge'ez script which is left-to-right, but we'll keep this for future RTL languages)
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

  const changeLanguage = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
      setIsRTL(rtlLanguages.includes(language));
      
      // Update document direction and language
      document.documentElement.lang = language;
      document.documentElement.dir = rtlLanguages.includes(language) ? 'rtl' : 'ltr';
      
      // Store preference
      localStorage.setItem('i18nextLng', language);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  useEffect(() => {
    // Initialize language settings
    const savedLanguage = localStorage.getItem('i18nextLng') || i18n.language || 'en';
    setCurrentLanguage(savedLanguage);
    setIsRTL(rtlLanguages.includes(savedLanguage));
    
    // Set document attributes
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = rtlLanguages.includes(savedLanguage) ? 'rtl' : 'ltr';

    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
      setIsRTL(rtlLanguages.includes(lng));
      document.documentElement.lang = lng;
      document.documentElement.dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const value = {
    currentLanguage,
    isRTL,
    changeLanguage,
    availableLanguages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};