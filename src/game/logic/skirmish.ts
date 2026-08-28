import type { Ctx } from 'boardgame.io';
import type { GameState, CardState } from '../types';
import {
    getEffectiveStrength,
    getEffectiveVitality,
} from '../../utils/cardStats';
import { getCardText } from '../../utils/i18n';
import {
    applyWoundAndCheckDeath,
    applyOverwhelmAndCheckDeath,
} from '../../utils/applyWoundAndCheckDeath';
import { audioService } from '../../services/audioService';
import {
    getKeywordValue,
    getEffectiveKeywords,
} from '../engine/keywords/keywordUtils';
import { getCalculatedStrength } from './stats/statCalculator';

/**
 * Helper interne pour extraire proprement le nom d'une carte dans la langue par défaut (FR).
 */
const getCardName = (cardObj: any, fallback: string): string => {
    if (!cardObj) return fallback;
    const cardState = cardObj.card || cardObj;
    return (
        getCardText(cardState, 'fr').title ||
        cardState.title ||
        cardState.name ||
        fallback
    );
};

/**
 * Vérifie s'il reste au moins un séide en vie sur le plateau ayant le mot-clé FIERCE.
 */
export const hasFierceMinionsOnBattlefield = (G: GameState): boolean => {
    const minionCards = (G.battlefield || []).filter(
        (c: any) => c.kind === 'SHADOW' && c.type === 'MINION'
    );

    const hasFierce = minionCards.some(
        (card: CardState) => getKeywordValue(card, 'FIERCE') >= 0
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
const getDamageBonus = (cards: CardState | CardState[]): number => {
    const list = Array.isArray(cards) ? cards : [cards];
    return list.reduce((sum, c) => {
        const bonus = getKeywordValue(c, 'DAMAGE');
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
 * Marque les cartes mortes / blessées, déclenche les sons et alimente `pendingDeadCardIds` & `lastWoundedCardIds`.
 */
export const resolveSkirmish = (G: GameState, _ctx?: Ctx) => {
    if (!G.activeSkirmishId) return;

    const skirmishIndex = G.skirmishes.findIndex(
        (s) => s.id === G.activeSkirmishId
    );
    if (skirmishIndex === -1) {
        G.activeSkirmishId = undefined;
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
    const minions = (G.battlefield || []).filter((c) =>
        skirmish.minionIds.includes(c.id || c.instanceId)
    );

    // Si le compagnon n'est plus là, on annule cette escarmouche
    if (!companion) {
        G.skirmishes.splice(skirmishIndex, 1);
        G.activeSkirmishId = undefined;
        G.actionWindow = undefined;
        return;
    }

    const companionName = getCardName(companion, 'Le compagnon');

    const companionStrength = getCalculatedStrength(G, companion);

    const minionsStrength = minions.reduce(
        (sum, m) => sum + getCalculatedStrength(G, m),
        0
    );

    G.lastWoundedCardIds = [];
    G.pendingDeadCardIds = [];

    const minionsSummary = minions
        .map(
            (m) => `${getCardName(m, 'Un séide')} (${getCardTotalStrength(m)})`
        )
        .join(', ');

    let resultMsg = `Résolution : ${companionName} (${companionStrength}) vs ${minionsSummary}`;
    resultMsg += ` [Total Ombre: ${minionsStrength}]. `;

    // ⚔️ CAS 1 : VICTOIRE DU COMPAGNON
    if (companionStrength > minionsStrength) {
        resultMsg += `Victoire de ${companionName} ! `;

        const isMinionsOverwhelmed =
            minionsStrength > 0
                ? companionStrength >= 2 * minionsStrength
                : companionStrength > 0;

        audioService.play('SMASH', { enablePitch: true });

        const woundsToApply = 1 + getDamageBonus(companion);

        minions.forEach((minion) => {
            if (isMinionsOverwhelmed) {
                applyOverwhelmAndCheckDeath(G, minion);
            } else {
                applyWoundAndCheckDeath(G, minion, woundsToApply);
            }
        });

        if (isMinionsOverwhelmed) {
            resultMsg += `Les séides sont SUBMERGÉS !`;
        } else if (woundsToApply > 1) {
            resultMsg += `(Chaque séide subit ${woundsToApply} blessures via DAMAGE +${woundsToApply - 1})`;
        }
    }
    // ⚔️ CAS 2 : VICTOIRE DE L'OMBRE (ou Égalité)
    else {
        resultMsg += `Victoire de l'Ombre ! `;

        const isCompanionOverwhelmed =
            companionStrength > 0
                ? minionsStrength >= 2 * companionStrength
                : minionsStrength > 0;

        audioService.play('SMASH', { enablePitch: true });

        if (isCompanionOverwhelmed) {
            applyOverwhelmAndCheckDeath(G, companion);
            resultMsg += `${companionName} est SUBMERGÉ et tué sur le coup !`;
        } else {
            const damageBonus = getDamageBonus(minions);
            const woundsToApply = 1 + damageBonus;

            const shouldDie = applyWoundAndCheckDeath(
                G,
                companion,
                woundsToApply
            );

            const damageText =
                damageBonus > 0
                    ? ` (${woundsToApply} blessures incluant DAMAGE +${damageBonus})`
                    : '';
            resultMsg += `${companionName} subit ${woundsToApply} blessure${woundsToApply > 1 ? 's' : ''}${damageText}${shouldDie ? ' et meurt' : ''}.`;
        }
    }

    G.statusMessage = resultMsg;
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
        const keywords = getEffectiveKeywords(minion);
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
