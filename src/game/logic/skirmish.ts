import type { Ctx } from 'boardgame.io';
import type { GameState, CardState, SkirmishState } from '../types';
import {
    getEffectiveStrength,
    getEffectiveVitality,
} from '../../utils/cardStats';
import { displayTitle } from '../../decks/cardMeta';
import {
    applyOverwhelmAndCheckDeath,
    applyWoundAndCheckDeath,
} from '../../utils/applyWoundAndCheckDeath';
import {
    getKeywordValue,
    getEffectiveKeywords,
} from '../engine/keywords/keywordUtils';
import { getCalculatedStrength } from './stats/statCalculator';
import {
    requestWounds,
    tryOpenCharacterDies,
    tryOpenLosesSkirmish,
    tryOpenWinsSkirmish,
} from '../engine/responseWindow';
import { clearExpiredTempKeywords } from '../engine/abilities/applyAbilityEffect';
import {
    appendJournal,
    formatBlessuresCount,
    formatPointsFardeau,
} from './journal';

/** Titre seul (pas de sous-titre) pour le journal de combat. */
const getCardName = (card: CardState | null | undefined, fallback: string): string =>
    (card ? displayTitle(card) : '') || fallback;

function joinNames(names: string[]): string {
    if (names.length === 0) return 'un adversaire';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} et ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

/**
 * Vérifie s'il reste au moins un séide en vie sur le plateau ayant le mot-clé FIERCE.
 */
export const hasFierceMinionsOnBattlefield = (G: GameState): boolean => {
    const minionCards = (G.battlefield || []).filter(
        (c: any) => c.kind === 'SHADOW' && c.type === 'MINION'
    );

    const hasFierce = minionCards.some(
        (card: CardState) => getKeywordValue(card, 'FIERCE', G) >= 0
    );
    return hasFierce;
};

/**
 * Calcule la force totale effective d'une carte (base + attachements)
 */
export const getCardTotalStrength = (card: CardState): number => {
    return getEffectiveStrength(card);
};

/**
 * Calcule les blessures supplémentaires apportées par le mot-clé DAMAGE +X.
 * Si une carte a DAMAGE +1, getKeywordValue doit renvoyer 1. Si elle n'a pas le mot-clé, 0.
 */
const getDamageBonus = (
    cards: CardState | CardState[],
    G: GameState
): number => {
    const list = Array.isArray(cards) ? cards : [cards];
    return list.reduce((sum, c) => {
        const bonus = getKeywordValue(c, 'DAMAGE', G);
        // On s'assure de ne prendre en compte que les valeurs stricte positives (> 0)
        return sum + (bonus > 0 ? bonus : 0);
    }, 0);
};

/**
 * Inflige une mort directe par submersion (overwhelm).
 * Inflige suffisamment de blessures pour réduire la vitalité restante à 0.
 */
export const applyOverwhelmToCard = (G: GameState, card: CardState) => {
    const remainingVitality = getEffectiveVitality(card);
    const woundsNeeded = Math.max(1, remainingVitality);

    // Inflige les blessures requises et marque la mort + déclenche le cri
    applyWoundAndCheckDeath(G, card, woundsNeeded);
};

/**
 * Résout le combat d'escarmouche actif.
 * Marque les cartes mortes / blessées et alimente `pendingDeadCardIds` & `lastWoundedCardIds`.
 */
export const resolveSkirmish = (G: GameState, _ctx?: Ctx) => {
    if (!G.activeSkirmishId) return;

    const skirmishIndex = G.skirmishes.findIndex(
        (s) => s.id === G.activeSkirmishId
    );
    if (skirmishIndex === -1) {
        G.activeSkirmishId = undefined;
        clearExpiredTempKeywords(G, 'SKIRMISH');
        return;
    }

    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    const skirmish = G.skirmishes[skirmishIndex];

    const companion = (fpPlayer?.fellowshipArea || []).find(
        (c) =>
            c.id === skirmish.companionId ||
            c.instanceId === skirmish.companionId
    );
    const minions = (G.battlefield || []).filter(
        (c) =>
            skirmish.minionIds.includes(c.id) ||
            skirmish.minionIds.includes(c.instanceId)
    );

    // Si le compagnon n'est plus là, on annule cette escarmouche
    if (!companion) {
        G.skirmishes.splice(skirmishIndex, 1);
        G.activeSkirmishId = undefined;
        G.actionWindow = undefined;
        clearExpiredTempKeywords(G, 'SKIRMISH');
        return;
    }

    const companionName = getCardName(companion, 'Le compagnon');
    const minionNames = minions.map((m) => getCardName(m, 'un séide'));
    const minionsLabel = joinNames(minionNames);

    const companionStrength = getCalculatedStrength(G, companion);

    const minionsStrength = minions.reduce(
        (sum, m) => sum + getCalculatedStrength(G, m),
        0
    );

    G.lastWoundedCardIds = [];
    G.lastExertedCardIds = [];
    G.pendingDeadCardIds = [];
    skirmish.resolved = true;

    const companionId = companion.instanceId || companion.id;
    // CR : égalité = l’Ombre gagne (pas « ni l’un ni l’autre »).
    if (companionStrength > minionsStrength) {
        G.pendingWinsSkirmish = {
            winnerIds: [companionId],
            skirmishId: skirmish.id,
        };
        G.pendingLosesSkirmish = {
            loserIds: minions.map((minion) => minion.instanceId || minion.id),
            skirmishId: skirmish.id,
        };
    } else {
        G.pendingWinsSkirmish = {
            winnerIds: minions.map((minion) => minion.instanceId || minion.id),
            skirmishId: skirmish.id,
        };
        G.pendingLosesSkirmish = {
            loserIds: [companionId],
            skirmishId: skirmish.id,
        };
    }

    const journalLines: string[] = [];

    // ⚔️ CAS 1 : VICTOIRE DU COMPAGNON
    if (companionStrength > minionsStrength) {
        journalLines.push(`${companionName} a vaincu ${minionsLabel}.`);

        // Submersion séides : ×2 par défaut (pas d’effet « ×3 » côté séide ici).
        const isMinionsOverwhelmed =
            minionsStrength > 0
                ? companionStrength >= 2 * minionsStrength
                : companionStrength > 0;

        const woundsToApply = 1 + getDamageBonus(companion, G);

        minions.forEach((minion) => {
            const minionName = getCardName(minion, 'Un séide');
            if (isMinionsOverwhelmed) {
                applyOverwhelmAndCheckDeath(G, minion);
                journalLines.push(`${minionName} est submergé et meurt.`);
            } else {
                requestWounds(G, minion, woundsToApply);
                if (!G.responseWindow?.isOpen) {
                    const died = Boolean(minion.isDead);
                    journalLines.push(
                        died
                            ? `${minionName} prend ${formatBlessuresCount(woundsToApply)} et meurt.`
                            : `${minionName} prend ${formatBlessuresCount(woundsToApply)}.`
                    );
                }
            }
        });
    }
    // ⚔️ CAS 2 : VICTOIRE DE L'OMBRE (ou Égalité)
    else {
        journalLines.push(
            minionNames.length > 1
                ? `${minionsLabel} ont vaincu ${companionName}.`
                : `${minionsLabel} a vaincu ${companionName}.`
        );

        // Everyone Knows etc. : seuil temporaire (×3) sur le compagnon.
        const companionOverwhelmFactor =
            companion.tempOverwhelmFactor?.factor &&
            companion.tempOverwhelmFactor.factor > 0
                ? companion.tempOverwhelmFactor.factor
                : 2;
        const isCompanionOverwhelmed =
            companionStrength > 0
                ? minionsStrength >=
                  companionOverwhelmFactor * companionStrength
                : minionsStrength > 0;

        if (isCompanionOverwhelmed) {
            applyOverwhelmAndCheckDeath(G, companion);
            journalLines.push(`${companionName} est submergé et meurt.`);
        } else {
            const damageBonus = getDamageBonus(minions, G);
            const woundsToApply = 1 + damageBonus;

            requestWounds(G, companion, woundsToApply);

            const waiting = Boolean(G.responseWindow?.isOpen);
            const tookWound = (G.lastWoundedCardIds || []).includes(
                companionId
            );
            const burdensInstead =
                !waiting && Boolean(G.wearingTheOneRing) && !tookWound;
            if (!waiting && burdensInstead) {
                const each = G.wearingTheOneRing!.replaceWoundWithBurdens;
                const total = each * woundsToApply;
                journalLines.push(
                    `${companionName} porte l’Anneau Unique : ${formatPointsFardeau(total)} à la place.`
                );
            } else if (!waiting) {
                journalLines.push(
                    companion.isDead
                        ? `${companionName} prend ${formatBlessuresCount(woundsToApply)} et meurt.`
                        : `${companionName} prend ${formatBlessuresCount(woundsToApply)}.`
                );
            }
        }
    }

    for (const line of journalLines) {
        appendJournal(G, line);
    }
    if (!G.responseWindow?.isOpen && journalLines.length > 0) {
        G.statusMessage = journalLines.join(' ');
    }
    if (tryOpenCharacterDies(G) === 'WAITING') return;
    if (tryOpenWinsSkirmish(G) === 'WAITING') return;
    tryOpenLosesSkirmish(G);
};

/**
 * Vérifie si une escarmouche contient au moins un Séide avec le mot-clé LURKER.
 */
export function isLurkerSkirmish(
    G: GameState,
    skirmish: SkirmishState
): boolean {
    const minionIds =
        skirmish.minionIds || (skirmish.minionId ? [skirmish.minionId] : []);

    const minions = (G.battlefield || []).filter(
        (c: CardState) =>
            minionIds.includes(c.id) || minionIds.includes(c.instanceId)
    );

    return minions.some((minion) => {
        const keywords = getEffectiveKeywords(minion, G);
        return keywords.some((k) => k.key === 'LURKER');
    });
}

/**
 * Vérifie si le joueur FP a le droit de sélectionner cette escarmouche.
 * Renvoie false si l'escarmouche est Lurker ALORS qu'il reste au moins une escarmouche non-Lurker.
 */
export function canSelectSkirmish(G: GameState, skirmishId: string): boolean {
    const skirmish = (G.skirmishes || []).find((s) => s.id === skirmishId);
    if (!skirmish) return false;

    const targetIsLurker = isLurkerSkirmish(G, skirmish);
    if (!targetIsLurker) return true;

    // S'il s'agit d'un Lurker, on vérifie s'il existe au moins une escarmouche NON-Lurker dans la liste
    const hasNonLurker = G.skirmishes.some((s) => !isLurkerSkirmish(G, s));

    // Si une escarmouche non-Lurker existe encore, la sélection est interdite
    return !hasNonLurker;
}
