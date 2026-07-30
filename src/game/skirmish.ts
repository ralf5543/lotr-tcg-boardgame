import type { Ctx } from 'boardgame.io';
import type { GameState, CardState } from './types';
import type { LotrEventsAPI } from './types'; // Ou depuis l'endroit où tu définis LotrEventsAPI

export const getCardTotalStrength = (card: CardState): number => {
    const baseStrength = card.strength ?? 0;
    const attachmentStrength = (card.attachments || []).reduce(
        (acc, att) => acc + (att.strength ?? 0),
        0
    );
    return baseStrength + attachmentStrength;
};

export const applyWoundToCard = (
    G: GameState,
    cardId: string,
    woundCount = 1
): boolean => {
    let cardOwner: '0' | '1' | undefined;
    let card = G.players['0'].fellowshipArea.find((c) => c.id === cardId);

    if (card) {
        cardOwner = '0';
    } else {
        card = G.battlefield.find((c) => c.id === cardId);
        if (card) {
            cardOwner = '1';
        }
    }

    if (!card || !cardOwner) return false;

    card.wounds = (card.wounds || 0) + woundCount;
    const vitality = card.vitality ?? 1;

    // Mort de la carte
    if (card.wounds >= vitality) {
        if (cardOwner === '0') {
            G.players['0'].fellowshipArea = G.players['0'].fellowshipArea.filter(
                (c) => c.id !== cardId
            );
            G.players['0'].discard.push(card);
        } else {
            G.battlefield = G.battlefield.filter((c) => c.id !== cardId);
            G.players['1'].discard.push(card);
        }

        // Nettoyage des attachements vers la défausse du propriétaire
        if (card.attachments && card.attachments.length > 0) {
            card.attachments.forEach((attachment) => {
                const owner = attachment.kind === 'SHADOW' ? '1' : '0';
                G.players[owner].discard.push(attachment);
            });
            card.attachments = [];
        }
        return true;
    }

    return false;
};

export const resolveSkirmish = (
    G: GameState,
    _ctx: Ctx,
    events?: LotrEventsAPI
) => {
    if (!G.activeSkirmishId) return;

    const skirmishIndex = G.skirmishes.findIndex(
        (s) => s.id === G.activeSkirmishId
    );
    if (skirmishIndex === -1) {
        G.activeSkirmishId = undefined;
        return;
    }

    const skirmish = G.skirmishes[skirmishIndex];
    const companion = G.players['0'].fellowshipArea.find(
        (c) => c.id === skirmish.companionId
    );
    const minions = G.battlefield.filter((c) =>
        skirmish.minionIds.includes(c.id)
    );

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

    let resultMsg = `Résolution : ${companion.name} (${companionStrength}) vs `;
    resultMsg += minions.map((m) => `${m.name} (${getCardTotalStrength(m)})`).join(', ');
    resultMsg += ` [Total Ombre: ${minionsStrength}]. `;

    if (companionStrength > minionsStrength) {
        resultMsg += `Victoire de ${companion.name} ! `;
        minions.forEach((minion) => {
            const killed = applyWoundToCard(G, minion.id, 1);
            resultMsg += `${minion.name} subit 1 blessure${killed ? ' et meurt' : ''}. `;
        });
    } else {
        resultMsg += `Victoire de l'Ombre ! `;

        // Règle d'écrasement (Overwhelm)
        const isOverwhelmed =
            companionStrength > 0
                ? minionsStrength >= 2 * companionStrength
                : minionsStrength > 0;

        if (isOverwhelmed) {
            const remainingVitality = (companion.vitality ?? 1) - (companion.wounds || 0);
            applyWoundToCard(G, companion.id, remainingVitality);
            resultMsg += `${companion.name} est submergé et tué sur le coup !`;
        } else {
            const killed = applyWoundToCard(G, companion.id, 1);
            resultMsg += `${companion.name} subit 1 blessure${killed ? ' et meurt' : ''}.`;
        }
    }

    G.statusMessage = resultMsg;

    G.skirmishes.splice(skirmishIndex, 1);
    G.activeSkirmishId = undefined;
    G.actionWindow = undefined;

    if (G.skirmishes.length === 0) {
        G.statusMessage += ' Tous les combats sont terminés.';
        events?.endPhase?.();
    }
};