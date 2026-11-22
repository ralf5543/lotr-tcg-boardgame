import type { SupportedLanguage } from '../utils/i18n';

export type { SupportedLanguage };

/** Les 5 langues avec traductions de cartes (même partielles). */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    'en',
    'fr',
    'de',
    'it',
    'es',
];

/** Libellés natifs (toujours dans la langue elle-même). */
export const LANGUAGE_NATIVE_LABELS: Record<SupportedLanguage, string> = {
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    es: 'Español',
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
    return (
        typeof value === 'string' &&
        (SUPPORTED_LANGUAGES as string[]).includes(value)
    );
}
