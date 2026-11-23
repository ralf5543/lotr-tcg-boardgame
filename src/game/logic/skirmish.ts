import type { Ctx } from 'boardgame.io';
import { setJournalJoinStatus } from '../../i18n/status';
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
import { getWhileOverwhelmFactor } from './stats/mechanics/whileModifier';
import {
    requestWounds,
    tryOpenCharacterDies,
    tryOpenLosesSkirmish,
    tryOpenWinsSkirmish,
} from '../engine/responseWindow';
import { clearExpiredTempKeywords } from '../engine/abilities/applyAbilityEffect';
import type { JournalKey } from '../../i18n/journal';
import {
    appendJournalNotice,
    formatPointsFardeau,
} from './journal';

/** Seuil de submersion : temp (Everyone Knows) > WHILE (Boromir) > ×2. */
function companionOverwhelmFactor(
    G: GameState,
    companion: CardState
): number {
    const temp = companion.tempOverwhelmFactor?.factor;
    if (temp && temp > 0) return temp;
    const whileFactor = getWhileOverwhelmFactor(G, companion);
    if (whileFactor && whileFactor > 0) return whileFactor;
    return 2;
}

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

    type PendingJournal = {
        key: JournalKey;
        params: Record<string, string | number | boolean | null | undefined>;
    };
    const journalPending: PendingJournal[] = [];
    const pushJ = (
        key: JournalKey,
        params: PendingJournal['params'] = {}
    ) => {
        journalPending.push({ key, params });
    };

    // ⚔️ CAS 1 : VICTOIRE DU COMPAGNON
    if (companionStrength > minionsStrength) {
        pushJ('SKIRMISH_WON', {
            winner: companionName,
            loser: minionsLabel,
        });

        // Submersion séides : ×2 par défaut (pas d’effet « ×3 » côté séide ici).
        const isMinionsOverwhelmed =
            minionsStrength > 0
                ? companionStrength >= 2 * minionsStrength
                : companionStrength > 0;
        if (G.pendingWinsSkirmish) {
            G.pendingWinsSkirmish.byOverwhelm = isMinionsOverwhelmed;
        }

        const woundsToApply = 1 + getDamageBonus(companion, G);

        minions.forEach((minion) => {
            const minionName = getCardName(minion, 'Un séide');
            if (isMinionsOverwhelmed) {
                applyOverwhelmAndCheckDeath(G, minion);
                pushJ('OVERWHELMED_DIED', { card: minionName });
            } else {
                requestWounds(G, minion, woundsToApply);
                if (!G.responseWindow?.isOpen) {
                    pushJ(
                        minion.isDead ? 'WOUND_TAKEN_DIED' : 'WOUND_TAKEN',
                        { card: minionName, count: woundsToApply }
                    );
                }
            }
        });
    }
    // ⚔️ CAS 2 : VICTOIRE DE L'OMBRE (ou Égalité)
    else {
        pushJ(
            minionNames.length > 1 ? 'SKIRMISH_WON_PLURAL' : 'SKIRMISH_WON',
            { winner: minionsLabel, loser: companionName }
        );

        // Everyone Knows (temp) / Boromir (WHILE) : seuil ×3 sur le compagnon.
        const overwhelmFactor = companionOverwhelmFactor(G, companion);
        const isCompanionOverwhelmed =
            companionStrength > 0
                ? minionsStrength >= overwhelmFactor * companionStrength
                : minionsStrength > 0;
        if (G.pendingWinsSkirmish) {
            G.pendingWinsSkirmish.byOverwhelm = isCompanionOverwhelmed;
        }

        if (isCompanionOverwhelmed) {
            applyOverwhelmAndCheckDeath(G, companion);
            pushJ('OVERWHELMED_DIED', { card: companionName });
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
                pushJ('RING_BURDENS_INSTEAD', {
                    card: companionName,
                    bid: formatPointsFardeau(total),
                });
            } else if (!waiting) {
                pushJ(
                    companion.isDead ? 'WOUND_TAKEN_DIED' : 'WOUND_TAKEN',
                    { card: companionName, count: woundsToApply }
                );
            }
        }
    }

    for (const { key, params } of journalPending) {
        appendJournalNotice(G, key, params);
    }
    if (!G.responseWindow?.isOpen && journalPending.length > 0) {
        setJournalJoinStatus(G, journalPending);
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
