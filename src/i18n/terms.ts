import type { SupportedLanguage } from './languages';
import { getUiMessages } from './ui';

/** Mot « crépuscule » selon la langue d’interface. */
export function twilightTerm(
    lang: SupportedLanguage,
    count = 1
): string {
    const c = getUiMessages(lang).chrome.common;
    return count > 1 ? c.twilights : c.twilight;
}

/**
 * Remplace le mot FR « crépuscule(s) » dans un libellé UI
 * (bulles d’action, etc.) selon la langue d’interface.
 */
export function localizeTwilightWords(
    text: string,
    lang: SupportedLanguage
): string {
    if (!text || lang === 'fr') return text;
    const singular = twilightTerm(lang, 1);
    const plural = twilightTerm(lang, 2);
    return text
        .replace(/crépuscules/gi, plural)
        .replace(/crépuscule/gi, singular);
}
