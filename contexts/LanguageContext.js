import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('ja'); // Default to Japanese

  return (
    React.createElement(LanguageContext.Provider, { value: { language, setLanguage } },
      children
    )
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
