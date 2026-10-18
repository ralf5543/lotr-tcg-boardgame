import type { Ability, CardState } from "../game/types";

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

/**
 * Clause affichée dans un toaster (site / réponse…).
 * Priorité : textFr collé à l’ability → gametext FR de la carte → text EN parseur.
 * (Évite d’afficher l’EN dès qu’un `ability.text` existe alors que le CSV FR est prêt.)
 */
export function getAbilityToastClause(
    ability: Ability | undefined | null,
    source: CardState | undefined | null,
    lang: SupportedLanguage = 'fr'
): string | undefined {
    const textFr = ability?.textFr?.trim();
    if (textFr) return textFr;

    if (source) {
        // Gametext de la langue demandée seulement (pas de repli EN ici).
        const localized = source.i18n?.[lang]?.gameText?.trim();
        if (localized) return localized;
    }

    const textEn = ability?.text?.trim();
    if (textEn) return textEn;

    if (source) {
        return getCardText(source, lang).gameText?.trim() || undefined;
    }
    return undefined;
}