// src/game/engine/validations/matchers.ts

import type { CardState, SiteCardState } from '../../types';
import { isRingBearerCard } from '../../../utils/cardUtils';
import { getEffectiveKeywords } from '../keywords/keywordUtils';
import { getEffectiveVitality } from '../../../utils/cardStats';

/**
 * Normalise un terme pour la comparaison case-insensitive.
 */
function normalize(val?: string): string {
    return (val || '').trim().toUpperCase();
}

/** Alias CSV / symboles sans trait d’union (`urukhai` → URUK-HAI). */
const CRITERION_ALIASES: Record<string, string> = {
    URUKHAI: 'URUK-HAI',
    NAZGUL: 'NAZGÛL',
    RINGBEARER: 'RING-BEARER',
    RINGBOUND: 'RING-BOUND',
};

function normalizeCriterion(criterion: string): string {
    const upper = normalize(criterion);
    return CRITERION_ALIASES[upper] || upper;
}

/**
 * Extraction du titre d'une carte en majuscules.
 */
function getCardTitle(card: CardState | SiteCardState): string {
    const c = card as CardState;
    return (
        c.title ||
        c.i18n?.en?.title ||
        c.i18n?.fr?.title ||
        (c as any).name ||
        ''
    )
        .trim()
        .toLowerCase();
}

/**
 * Vérifie si une carte en jeu satisfait un unique critère (ex: "DWARF", "UNBOUND", "Gimli", "SITE").
 */
export function cardMatchesCriterion(
    card: CardState | SiteCardState,
    criterion: string
): boolean {
    if (!card || !criterion) return false;

    const critTrim = criterion.trim();
    const critUpper = normalizeCriterion(critTrim);
    const c = card as CardState;

    // Nom propre (casse mixte, ex. « Gandalf ») → titre uniquement.
    // Sinon « Gandalf » matcherait aussi la culture GANDALF (Ents, etc.).
    // « Bearer » reste un jeton spécial (pas un titre de carte).
    const isProperName =
        critTrim !== critUpper &&
        !/^bearer$/i.test(critTrim) &&
        /[a-zà-ÿ]/.test(critTrim);
    if (isProperName) {
        const cardTitle = getCardTitle(card);
        return Boolean(cardTitle && cardTitle === critTrim.toLowerCase());
    }

    if (critUpper === 'CHARACTER') {
        return (
            c.type === 'COMPANION' ||
            c.type === 'ALLY' ||
            c.type === 'MINION'
        );
    }

    if (critUpper === 'UNBOUND') {
        const keywordsUpper = (c.keywords || []).map((k) => normalize(k));
        if (keywordsUpper.includes('UNBOUND')) return true;
        if (keywordsUpper.includes('RING-BOUND')) return false;
        if (isRingBearerCard(c)) return false;
        return c.type === 'COMPANION' || c.type === 'ALLY';
    }

    // « exhausted » : 1 vitalité restante (CR), pas mort.
    if (critUpper === 'EXHAUSTED') {
        if (c.isDead) return false;
        const typeOk =
            c.type === 'COMPANION' ||
            c.type === 'ALLY' ||
            c.type === 'MINION';
        if (!typeOk) return false;
        return getEffectiveVitality(c) === 1;
    }

    if (critUpper.startsWith('SIGNET_')) {
        const wanted = critUpper.slice('SIGNET_'.length);
        return normalize(c.signet || '') === wanted;
    }

    // Type SITE (carte site JSON ou SiteCardState sur le path)
    if (critUpper === 'SITE') {
        if (c.type === 'SITE') return true;
        const site = card as SiteCardState;
        if (site.ownerId != null && site.siteNumber != null) return true;
    }

    // Race (DWARF, ELF, HOBBIT, etc.)
    if (c.race && normalize(c.race) === critUpper) return true;

    // Culture (DWARVEN, ELVEN, SHIRE, GANDALF, etc.)
    if (c.culture && normalize(c.culture) === critUpper) return true;

    // Type (COMPANION, MINION, ALLY, POSSESSION, CONDITION, etc.)
    if (c.type && normalize(c.type) === critUpper) return true;

    // Kind (SHADOW / FREE_PEOPLE) — ex. « Shadow possession »
    if (c.kind && normalize(c.kind) === critUpper) return true;
    if (critUpper === 'FREE_PEOPLES' && normalize(c.kind) === 'FREE_PEOPLE') {
        return true;
    }

    // Sous-type (HAND-WEAPON, ARMOR, …)
    if (c.subtype && normalize(c.subtype) === critUpper) return true;

    // « weapon » = arme de mêlée ou à distance
    if (
        critUpper === 'WEAPON' &&
        (normalize(c.subtype) === 'HAND-WEAPON' ||
            normalize(c.subtype) === 'RANGED-WEAPON')
    ) {
        return true;
    }

    // Keywords (UNBOUND, RING-BOUND, ARCHER, KNIGHT, HUNTER 1 → HUNTER, etc.)
    const effectiveKeywords = getEffectiveKeywords(c);
    if (
        effectiveKeywords.some(
            (kw) =>
                kw.key === critUpper || normalize(String(kw.raw)) === critUpper
        )
    ) {
        return true;
    }

    // Titre / Nom propre en majuscules (rare) — repli
    const cardTitle = getCardTitle(card);
    if (cardTitle && cardTitle === critTrim.toLowerCase()) {
        return true;
    }

    return false;
}

/**
 * Vérifie si une carte satisfait un GROUPE de critères (Logique ET).
 * Ex: ["UNBOUND", "HOBBIT"] -> La carte doit être UNBOUND ET HOBBIT.
 */
export function cardMatchesGroup(
    card: CardState | SiteCardState,
    group: string[]
): boolean {
    if (!group || group.length === 0) return false;
    return group.every((criterion) => cardMatchesCriterion(card, criterion));
}

/**
 * Validation DNF (Disjunctive Normal Form / Logique OU de groupes ET).
 * Ex: [ ["DWARF"], ["ELF"] ] -> La carte doit être DWARF OU ELF.
 */
export function cardMatchesTarget(
    card: CardState | SiteCardState,
    targetGroups: string[][]
): boolean {
    if (!targetGroups || targetGroups.length === 0) return false;
    return targetGroups.some((group) => cardMatchesGroup(card, group));
}
