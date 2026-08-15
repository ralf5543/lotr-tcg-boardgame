import type { Ctx } from 'boardgame.io';
import type { GameState, CardState } from '../types';
import { getEffectiveStrength } from '../../utils/cardStats';
import { getCardText } from '../../utils/i18n';

/**
 * Helper interne pour extraire proprement le nom d'une carte dans la langue par défaut (FR).
 */
const getCardName = (cardObj: any, fallback: string): string => {
    if (!cardObj) return fallback;
    const cardState = cardObj.card || cardObj;
    return getCardText(cardState, 'fr').title || cardState.title || cardState.name || fallback;
};

/**
 * Calcule la force totale effective d'une carte (base + attachements)
 */
export const getCardTotalStrength = (card: CardState): number => {
    return getEffectiveStrength(card);
};

/**
 * Applique une blessure à une carte et retourne `true` si elle succombe à ses blessures.
 */
export const applyWoundToCard = (
    G: GameState,
    card: CardState,
    woundCount = 1
): boolean => {
    card.wounds = (card.wounds || 0) + woundCount;
    const vitality = card.vitality ?? 1;

    const cardId = card.id || card.instanceId;

    // Toujours marquer la carte comme blessée pour l'animation
    if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
    if (!G.lastWoundedCardIds.includes(cardId)) {
        G.lastWoundedCardIds.push(cardId);
    }

    if (card.wounds >= vitality) {
        card.isDead = true;
        if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
        if (!G.pendingDeadCardIds.includes(cardId)) {
            G.pendingDeadCardIds.push(cardId);
        }
        return true;
    }
    return false;
};

/**
 * Inflige une mort directe par submersion (overwhelm) en déclenchant 
 * correctement les tableaux d'animations (lastWoundedCardIds & pendingDeadCardIds).
 */
export const applyOverwhelmToCard = (
    G: GameState,
    card: CardState
) => {
    const cardId = card.id || card.instanceId;

    // On inflige autant de blessures que nécessaire pour amener à la vitalité
    const vitality = card.vitality ?? 1;
    card.wounds = vitality;
    card.isDead = true;

    if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
    if (!G.lastWoundedCardIds.includes(cardId)) {
        G.lastWoundedCardIds.push(cardId);
    }

    if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
    if (!G.pendingDeadCardIds.includes(cardId)) {
        G.pendingDeadCardIds.push(cardId);
    }
};

/**
 * Résout le combat d'escarmouche actif.
 * Marque les cartes mortes / blessées et alimente `pendingDeadCardIds` & `lastWoundedCardIds` 
 * pour le rendu visuel.
 */
export const resolveSkirmish = (
    G: GameState,
    _ctx?: Ctx
) => {
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
        (c) => c.id === skirmish.companionId || c.instanceId === skirmish.companionId
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

    const companionStrength = getCardTotalStrength(companion);
    const minionsStrength = minions.reduce(
        (sum, m) => sum + getCardTotalStrength(m),
        0
    );

    G.lastWoundedCardIds = [];
    G.pendingDeadCardIds = [];

    const minionsSummary = minions
        .map((m) => `${getCardName(m, 'Un séide')} (${getCardTotalStrength(m)})`)
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

        minions.forEach((minion) => {
            if (isMinionsOverwhelmed) {
                applyOverwhelmToCard(G, minion);
            } else {
                applyWoundToCard(G, minion, 1);
            }
        });

        if (isMinionsOverwhelmed) {
            resultMsg += `Les séides sont SUBMERGÉS !`;
        }
    } 
    // ⚔️ CAS 2 : VICTOIRE DE L'OMBRE (ou Égalité)
    else {
        resultMsg += `Victoire de l'Ombre ! `;

        const isCompanionOverwhelmed =
            companionStrength > 0
                ? minionsStrength >= 2 * companionStrength
                : minionsStrength > 0;

        if (isCompanionOverwhelmed) {
            applyOverwhelmToCard(G, companion);
            resultMsg += `${companionName} est SUBMERGÉ et tué sur le coup !`;
        } else {
            const shouldDie = applyWoundToCard(G, companion, 1);
            resultMsg += `${companionName} subit 1 blessure${shouldDie ? ' et meurt' : ''}.`;
        }
    }

    G.statusMessage = resultMsg;
};