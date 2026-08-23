// src/game/engine/validations/matchers.ts

import type { CardState, SiteCardState } from '../../types';

/**
 * Normalise un terme pour la comparaison case-insensitive.
 */
function normalize(val?: string): string {
    return (val || '').trim().toUpperCase();
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

    const critUpper = criterion.toUpperCase().trim();
    const c = card as CardState;

    // Type SITE
    if (critUpper === 'SITE' && c.type === 'SITE') return true;

    // Race (DWARF, ELF, HOBBIT, etc.)
    if (c.race && normalize(c.race) === critUpper) return true;

    // Culture (DWARVEN, ELVEN, SHIRE, GANDALF, etc.)
    if (c.culture && normalize(c.culture) === critUpper) return true;

    // Type (COMPANION, MINION, ALLY, POSSESSION, CONDITION, etc.)
    if (c.type && normalize(c.type) === critUpper) return true;

    // Keywords (UNBOUND, RING-BOUND, ARCHER, KNIGHT, etc.)
    if (Array.isArray(c.keywords)) {
        const keywordsUpper = c.keywords.map((k) => normalize(k));
        if (keywordsUpper.includes(critUpper)) return true;
    }

    // Titre / Nom propre (ex: "Gimli", "Frodo", "The One Ring")
    const cardTitle = getCardTitle(card);
    if (cardTitle && cardTitle === criterion.trim().toLowerCase()) {
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