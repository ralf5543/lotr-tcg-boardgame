import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    isSupportedLanguage,
    type SupportedLanguage,
} from '../i18n/languages';
import { PreferencesContext } from './PreferencesContext';

const STORAGE_KEY = 'lotr.preferences';

type StoredPreferences = {
    uiLanguage?: SupportedLanguage;
    cardLanguage?: SupportedLanguage;
};

function readStored(): StoredPreferences {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as StoredPreferences;
        return {
            uiLanguage: isSupportedLanguage(parsed.uiLanguage)
                ? parsed.uiLanguage
                : undefined,
            cardLanguage: isSupportedLanguage(parsed.cardLanguage)
                ? parsed.cardLanguage
                : undefined,
        };
    } catch {
        return {};
    }
}

function writeStored(prefs: {
    uiLanguage: SupportedLanguage;
    cardLanguage: SupportedLanguage;
}): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        /* quota / mode privé */
    }
}

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const stored = readStored();
    const [uiLanguage, setUiLanguageState] = useState<SupportedLanguage>(
        stored.uiLanguage ?? 'fr'
    );
    const [cardLanguage, setCardLanguageState] = useState<SupportedLanguage>(
        stored.cardLanguage ?? 'fr'
    );

    useEffect(() => {
        writeStored({ uiLanguage, cardLanguage });
        document.documentElement.lang = uiLanguage;
    }, [uiLanguage, cardLanguage]);

    const setUiLanguage = useCallback((lang: SupportedLanguage) => {
        setUiLanguageState(lang);
    }, []);

    const setCardLanguage = useCallback((lang: SupportedLanguage) => {
        setCardLanguageState(lang);
    }, []);

    const value = useMemo(
        () => ({
            uiLanguage,
            cardLanguage,
            setUiLanguage,
            setCardLanguage,
        }),
        [uiLanguage, cardLanguage, setUiLanguage, setCardLanguage]
    );

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
};
