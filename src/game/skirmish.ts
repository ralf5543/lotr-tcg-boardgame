import type { Ctx } from 'boardgame.io';
import type { GameState, CardState } from './types';

export const getCardTotalStrength = (card: CardState): number => {
    return card.strength ?? 0;
};

/**
 * Tue une carte instantanément (ex: Submersion / Overwhelm) sans passer par l'ajout de blessures
 */
export const killCardDirectly = (
    G: GameState,
    cardId: string
): { cardOwner?: '0' | '1'; killedCard?: CardState } => {
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

    if (!card || !cardOwner) return {};

    // 1. Déplacement de la carte vers la bonne zone de mort
    if (cardOwner === '0') {
        G.players['0'].fellowshipArea = G.players['0'].fellowshipArea.filter(
            (c) => c.id !== cardId
        );
        if (!G.players['0'].deadPile) G.players['0'].deadPile = [];
        G.players['0'].deadPile.push(card);
    } else {
        G.battlefield = G.battlefield.filter((c) => c.id !== cardId);
        G.players['1'].discard.push(card);
    }

    // 2. Nettoyage des attachements vers la défausse respective de leur proprio
    if (card.attachments && card.attachments.length > 0) {
        card.attachments.forEach((attachment) => {
            const owner = attachment.kind === 'SHADOW' ? '1' : '0';
            G.players[owner].discard.push(attachment);
        });
        card.attachments = [];
    }

    return { cardOwner, killedCard: card };
};

/**
 * Calcule les blessures sans tuer la carte immédiatement 
 * (pour laisser le temps aux animations visuelles d'exécuter le shake)
 */
export const applyWoundToCard = (
    _G: GameState,
    card: CardState,
    woundCount = 1
): boolean => {
    card.wounds = (card.wounds || 0) + woundCount;
    const vitality = card.vitality ?? 1;

    // Retourne true si la carte DOIT mourir (blessures >= vitalité)
    return card.wounds >= vitality;
};

export const resolveSkirmish = (
    G: GameState,
    _ctx: Ctx
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

    G.lastWoundedCardIds = [];
    // Stocke les cartes destinées à mourir à la fin du timer visuel
    G.pendingDeadCardIds = [];

    let resultMsg = `Résolution : ${companion.title} (${companionStrength}) vs `;
    resultMsg += minions
        .map((m) => `${m.title} (${getCardTotalStrength(m)})`)
        .join(', ');
    resultMsg += ` [Total Ombre: ${minionsStrength}]. `;

    // -------------------------------------------------------------
    // ⚔️ CAS 1 : VICTOIRE DU COMPAGNON
    // -------------------------------------------------------------
    if (companionStrength > minionsStrength) {
    resultMsg += `Victoire de ${companion.title} ! `;

    const isMinionsOverwhelmed =
        minionsStrength > 0
            ? companionStrength >= 2 * minionsStrength
            : companionStrength > 0;

    if (isMinionsOverwhelmed) {
        minions.forEach((minion) => {
            if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
            G.pendingDeadCardIds.push(minion.id);

            if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
            G.lastWoundedCardIds.push(minion.id);
        });
        resultMsg += `Les séides sont SUBMERGÉS !`;
    } else {
            minions.forEach((minion) => {
                const shouldDie = applyWoundToCard(G, minion, 1);
                
                if (shouldDie) {
                    if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
                    G.pendingDeadCardIds.push(minion.id);
                } else {
                    if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
                    G.lastWoundedCardIds.push(minion.id);
                }
                resultMsg += `${minion.title} subit 1 blessure${shouldDie ? ' et meurt' : ''}. `;
            });
        }
    }
    // -------------------------------------------------------------
    // ⚔️ CAS 2 : VICTOIRE DE L'OMBRE (ou Égalité)
    // -------------------------------------------------------------
    else {
    resultMsg += `Victoire de l'Ombre ! `;

    const isCompanionOverwhelmed =
        companionStrength > 0
            ? minionsStrength >= 2 * companionStrength
            : minionsStrength > 0;

    if (isCompanionOverwhelmed) {
        if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
        G.pendingDeadCardIds.push(companion.id);

        // 🟢 Idem pour le Compagnon submergé !
        if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
        G.lastWoundedCardIds.push(companion.id);

        resultMsg += `${companion.name} est SUBMERGÉ et tué sur le coup !`;
    } else {
            const shouldDie = applyWoundToCard(G, companion, 1);

            if (shouldDie) {
                if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
                G.pendingDeadCardIds.push(companion.id);
            } else {
                if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
                G.lastWoundedCardIds.push(companion.id);
            }
            resultMsg += `${companion.title} subit 1 blessure${shouldDie ? ' et meurt (Cimetière)' : ''}.`;
        }
    }

    G.statusMessage = resultMsg;
};

/**
 * 🟢 Nettoie l'escarmouche et applique les morts après le délai d'1.5s
 */
export const finishSkirmishResolution = (
    G: GameState,
    _ctx: Ctx,
    events?: { endPhase?: () => void }
) => {
    // 1. Purge définitive des cartes tuées pendant ce combat
    if (G.pendingDeadCardIds && G.pendingDeadCardIds.length > 0) {
        G.pendingDeadCardIds.forEach((cardId) => {
            killCardDirectly(G, cardId);
        });
        G.pendingDeadCardIds = [];
    }

    // 2. Retrait de l'escarmouche du state (libère visuellement les séides survivants)
    if (G.activeSkirmishId) {
        const skirmishIndex = G.skirmishes.findIndex(
            (s) => s.id === G.activeSkirmishId
        );
        if (skirmishIndex !== -1) {
            G.skirmishes.splice(skirmishIndex, 1);
        }
    }

    G.activeSkirmishId = undefined;
    G.actionWindow = undefined;
    G.lastWoundedCardIds = [];

    // 3. Passage de phase si plus aucun combat
    if (G.skirmishes.length === 0) {
        G.statusMessage += ' Tous les combats sont terminés.';
        events?.endPhase?.();
    }
};