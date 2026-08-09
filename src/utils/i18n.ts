import type { CardState } from "../game/types";

export type SupportedLanguage = 'fr' | 'en' | 'de' | 'it' | 'es';

export interface CardLocalizedContent {
    title: string;
    subtitle?: string;
    gameText?: string;
    loreText?: string;
}

export function getCardText(
    card: CardState,
    lang: SupportedLanguage = 'fr'
): CardLocalizedContent {
    const primary = card.i18n?.[lang];
    const fallback = card.i18n?.['en'];

    return {
        title: primary?.title || fallback?.title || '',
        subtitle: primary?.subtitle || fallback?.subtitle,
        gameText: primary?.gameText || fallback?.gameText,
        loreText: primary?.loreText || fallback?.loreText,
    };
}