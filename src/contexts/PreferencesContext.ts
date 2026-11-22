import { createContext, useContext } from 'react';
import type { SupportedLanguage } from '../i18n/languages';

export interface PreferencesContextValue {
    uiLanguage: SupportedLanguage;
    cardLanguage: SupportedLanguage;
    setUiLanguage: (lang: SupportedLanguage) => void;
    setCardLanguage: (lang: SupportedLanguage) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(
    null
);

export function usePreferences(): PreferencesContextValue {
    const ctx = useContext(PreferencesContext);
    if (!ctx) {
        throw new Error('usePreferences must be used within PreferencesProvider');
    }
    return ctx;
}

/** Variante douce pour composants partagés hors provider (tests, etc.). */
export function usePreferencesOptional(): PreferencesContextValue | null {
    return useContext(PreferencesContext);
}
