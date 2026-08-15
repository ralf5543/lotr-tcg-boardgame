import type { Ctx } from 'boardgame.io';
import type { GameState, CardState } from './types';
import { getEffectiveStrength } from '../utils/cardStats';

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
    _G: GameState,
    card: CardState,
    woundCount = 1
): boolean => {
    card.wounds = (card.wounds || 0) + woundCount;
    const vitality = card.vitality ?? 1;

    if (card.wounds >= vitality) {
        card.isDead = true;
        return true;
    }
    return false;
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

    const companionStrength = getCardTotalStrength(companion);
    const minionsStrength = minions.reduce(
        (sum, m) => sum + getCardTotalStrength(m),
        0
    );

    G.lastWoundedCardIds = [];
    G.pendingDeadCardIds = [];

    let resultMsg = `Résolution : ${companion.title} (${companionStrength}) vs `;
    resultMsg += minions
        .map((m) => `${m.title} (${getCardTotalStrength(m)})`)
        .join(', ');
    resultMsg += ` [Total Ombre: ${minionsStrength}]. `;

    // ⚔️ CAS 1 : VICTOIRE DU COMPAGNON
    if (companionStrength > minionsStrength) {
        resultMsg += `Victoire de ${companion.title} ! `;

        const isMinionsOverwhelmed =
            minionsStrength > 0
                ? companionStrength >= 2 * minionsStrength
                : companionStrength > 0;

        minions.forEach((minion) => {
            const minionId = minion.id || minion.instanceId;
            if (isMinionsOverwhelmed) {
                minion.isDead = true;
                if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
                G.pendingDeadCardIds.push(minionId);
            } else {
                const shouldDie = applyWoundToCard(G, minion, 1);
                if (shouldDie) {
                    if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
                    G.pendingDeadCardIds.push(minionId);
                } else {
                    if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
                    G.lastWoundedCardIds.push(minionId);
                }
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

        const companionId = companion.id || companion.instanceId;

        if (isCompanionOverwhelmed) {
            companion.isDead = true;
            if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
            G.pendingDeadCardIds.push(companionId);
            resultMsg += `${companion.title} est SUBMERGÉ et tué sur le coup !`;
        } else {
            const shouldDie = applyWoundToCard(G, companion, 1);
            if (shouldDie) {
                if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
                G.pendingDeadCardIds.push(companionId);
            } else {
                if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
                G.lastWoundedCardIds.push(companionId);
            }
            resultMsg += `${companion.title} subit 1 blessure${shouldDie ? ' et meurt' : ''}.`;
        }
    }

    // Retrait de l'escarmouche traitée
    G.skirmishes.splice(skirmishIndex, 1);
    G.activeSkirmishId = undefined;
    G.actionWindow = undefined;
    G.statusMessage = resultMsg;
};