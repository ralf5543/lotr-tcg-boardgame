import type { SupportedLanguage } from '../languages';
import { localizeGameTerms } from '../terms';

/** Consignes générées par `formatDesignationPrompt` (halo / ciblage). */
export type DesignationPromptMessages = {
    chooseWho: (who: string) => string;
    chooseWhoOr: (parts: string[]) => string;
    removeTokenCard: string;
    exertCharacters: (n: number) => string;
    skirmishingCharacter: string;
    reinforceCard: string;
    stackFromHand: string;
    playFromHand: string;
    chooseTarget: string;
    pipeweed: string;
    signetCompanion: (signet: string) => string;
    woundedPerCulture: string;
    healCompanions: string;
    discardConditions: (n: number) => string;
    discardTargets: (n: number) => string;
};

const fr: DesignationPromptMessages = {
    chooseWho: (who) => `Choisissez ${who}.`,
    chooseWhoOr: (parts) => `Choisissez ${parts.join(' ou ')}.`,
    removeTokenCard: 'Choisissez une carte dont retirer un jeton.',
    exertCharacters: (n) =>
        `Choisissez ${n} personnages à affaiblir.`,
    skirmishingCharacter: 'Choisissez un personnage au combat.',
    reinforceCard: 'Choisissez une carte à renforcer.',
    stackFromHand: 'Choisissez une carte de votre main à empiler.',
    playFromHand: 'Choisissez la carte à jouer dans votre main.',
    chooseTarget: 'Choisissez une cible.',
    pipeweed: 'Choisissez une herbe à pipe.',
    signetCompanion: (signet) =>
        `Choisissez un compagnon au sceau ${signet}.`,
    woundedPerCulture:
        'Choisissez un compagnon blessé de chaque culture.',
    healCompanions: 'Choisissez les compagnons à soigner.',
    discardConditions: (n) =>
        `Choisissez ${n} situation${n > 1 ? 's' : ''} à défausser (autant que possible).`,
    discardTargets: (n) =>
        `Choisissez ${n} cible${n > 1 ? 's' : ''} à défausser (autant que possible).`,
};

const en: DesignationPromptMessages = {
    chooseWho: (who) => `Choose ${who}.`,
    chooseWhoOr: (parts) => `Choose ${parts.join(' or ')}.`,
    removeTokenCard: 'Choose a card to remove a token from.',
    exertCharacters: (n) =>
        `Choose ${n} character${n > 1 ? 's' : ''} to exert.`,
    skirmishingCharacter: 'Choose a character in a skirmish.',
    reinforceCard: 'Choose a card to reinforce.',
    stackFromHand: 'Choose a card from your hand to stack.',
    playFromHand: 'Choose the card to play from your hand.',
    chooseTarget: 'Choose a target.',
    pipeweed: 'Choose a pipeweed.',
    signetCompanion: (signet) =>
        `Choose a companion with the ${signet} signet.`,
    woundedPerCulture:
        'Choose one wounded companion of each culture.',
    healCompanions: 'Choose the companions to heal.',
    discardConditions: (n) =>
        `Choose ${n} condition${n > 1 ? 's' : ''} to discard (as many as possible).`,
    discardTargets: (n) =>
        `Choose ${n} target${n > 1 ? 's' : ''} to discard (as many as possible).`,
};

const de: DesignationPromptMessages = {
    chooseWho: (who) => `Wähle ${who}.`,
    chooseWhoOr: (parts) => `Wähle ${parts.join(' oder ')}.`,
    removeTokenCard: 'Wähle eine Karte, von der ein Marker entfernt wird.',
    exertCharacters: (n) =>
        `Wähle ${n} Charakter${n > 1 ? 'e' : ''} zum Anspannen.`,
    skirmishingCharacter: 'Wähle einen Charakter im Kampf.',
    reinforceCard: 'Wähle eine Karte zum Verstärken.',
    stackFromHand: 'Wähle eine Karte aus deiner Hand zum Stapeln.',
    playFromHand: 'Wähle die Karte aus deiner Hand zum Spielen.',
    chooseTarget: 'Wähle ein Ziel.',
    pipeweed: 'Wähle ein Pfeifenkraut.',
    signetCompanion: (signet) =>
        `Wähle einen Gefährten mit dem Siegel ${signet}.`,
    woundedPerCulture:
        'Wähle einen verwundeten Gefährten jeder Kultur.',
    healCompanions: 'Wähle die zu heilenden Gefährten.',
    discardConditions: (n) =>
        `Wähle ${n} Zustand${n > 1 ? 'e' : ''} zum Ablegen (so viele wie möglich).`,
    discardTargets: (n) =>
        `Wähle ${n} Ziel${n > 1 ? 'e' : ''} zum Ablegen (so viele wie möglich).`,
};

const it: DesignationPromptMessages = {
    chooseWho: (who) => `Scegli ${who}.`,
    chooseWhoOr: (parts) => `Scegli ${parts.join(' o ')}.`,
    removeTokenCard: 'Scegli una carta da cui rimuovere un gettone.',
    exertCharacters: (n) =>
        `Scegli ${n} personagg${n > 1 ? 'i' : 'io'} da affaticare.`,
    skirmishingCharacter: 'Scegli un personaggio in combattimento.',
    reinforceCard: 'Scegli una carta da rafforzare.',
    stackFromHand: 'Scegli una carta dalla mano da impilare.',
    playFromHand: 'Scegli la carta da giocare dalla mano.',
    chooseTarget: 'Scegli un bersaglio.',
    pipeweed: 'Scegli un’erba da pipa.',
    signetCompanion: (signet) =>
        `Scegli un compagno con il sigillo ${signet}.`,
    woundedPerCulture:
        'Scegli un compagno ferito di ogni cultura.',
    healCompanions: 'Scegli i compagni da curare.',
    discardConditions: (n) =>
        `Scegli ${n} condizion${n > 1 ? 'i' : 'e'} da scartare (quante possibile).`,
    discardTargets: (n) =>
        `Scegli ${n} bersagl${n > 1 ? 'i' : 'io'} da scartare (quanti possibile).`,
};

const es: DesignationPromptMessages = {
    chooseWho: (who) => `Elige ${who}.`,
    chooseWhoOr: (parts) => `Elige ${parts.join(' o ')}.`,
    removeTokenCard: 'Elige una carta de la que quitar una ficha.',
    exertCharacters: (n) =>
        `Elige ${n} personaje${n > 1 ? 's' : ''} que agotar.`,
    skirmishingCharacter: 'Elige un personaje en combate.',
    reinforceCard: 'Elige una carta que reforzar.',
    stackFromHand: 'Elige una carta de tu mano que apilar.',
    playFromHand: 'Elige la carta que jugar de tu mano.',
    chooseTarget: 'Elige un objetivo.',
    pipeweed: 'Elige una hierba de pipa.',
    signetCompanion: (signet) =>
        `Elige un compañero con el sello ${signet}.`,
    woundedPerCulture:
        'Elige un compañero herido de cada cultura.',
    healCompanions: 'Elige los compañeros que curar.',
    discardConditions: (n) =>
        `Elige ${n} condición${n > 1 ? 'es' : ''} que descartar (tantas como sea posible).`,
    discardTargets: (n) =>
        `Elige ${n} objetivo${n > 1 ? 's' : ''} que descartar (tantos como sea posible).`,
};

export const DESIGNATION_PROMPT_MESSAGES: Record<
    SupportedLanguage,
    DesignationPromptMessages
> = { fr, en, de, it, es };

export function getDesignationPrompts(
    lang: SupportedLanguage
): DesignationPromptMessages {
    return DESIGNATION_PROMPT_MESSAGES[lang] ?? fr;
}

/** Libellé « qui » FR → termes localisés (repli, pas une grammaire complète). */
export function localizeWhoLabel(
    whoFr: string,
    lang: SupportedLanguage
): string {
    if (!whoFr || lang === 'fr') return whoFr;
    // Enlève l’article FR avant le repli de termes (« un compagnon » → companion).
    const stripped = whoFr.replace(/^(un|une|le|la|les|votre|vos)\s+/i, '');
    return localizeGameTerms(stripped, lang);
}
