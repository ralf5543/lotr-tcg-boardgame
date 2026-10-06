import type { CardState, GameState } from '../game/types';

const matchCard = (card: CardState | undefined | null, targetId: string) =>
    Boolean(card && (card.instanceId === targetId || card.id === targetId));

function removeFromList(
    list: CardState[] | undefined,
    targetId: string
): CardState | null {
    if (!list) return null;
    const index = list.findIndex((card) => matchCard(card, targetId));
    if (index >= 0) {
        const [removed] = list.splice(index, 1);
        return removed || null;
    }
    for (const host of list) {
        if (!host) continue;
        if (host.attachments) {
            const attachedIndex = host.attachments.findIndex((card) =>
                matchCard(card, targetId)
            );
            if (attachedIndex >= 0) {
                const [removed] = host.attachments.splice(attachedIndex, 1);
                return removed || null;
            }
        }
        if (host.stacked) {
            const stackedIndex = host.stacked.findIndex((card) =>
                matchCard(card, targetId)
            );
            if (stackedIndex >= 0) {
                const [removed] = host.stacked.splice(stackedIndex, 1);
                return removed || null;
            }
            for (const att of host.attachments || []) {
                if (!att?.stacked) continue;
                const attStackedIndex = att.stacked.findIndex((card) =>
                    matchCard(card, targetId)
                );
                if (attStackedIndex >= 0) {
                    const [removed] = att.stacked.splice(attStackedIndex, 1);
                    return removed || null;
                }
            }
        }
    }
    return null;
}

/** Défausse aussi les cartes empilées sur l’hôte (Web, Narsil…). */
function discardStackedWithHost(
    G: GameState,
    host: CardState,
    ownerId: string
): void {
    const stacked = host.stacked;
    if (!stacked?.length) return;
    host.stacked = [];
    const pile = ownerDiscardPile(G, ownerId, host);
    if (!pile) return;
    for (const card of stacked) {
        if (card) pile.push(card);
    }
}

function ownerDiscardPile(
    G: GameState,
    ownerId: string,
    card: CardState
): CardState[] | null {
    const player = G.players[ownerId];
    if (player) {
        if (!player.discard) player.discard = [];
        return player.discard;
    }
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const fallbackId = card.kind === 'FREE_PEOPLE' ? fpId : shadowId;
    const fallback = G.players[fallbackId];
    if (!fallback) return null;
    if (!fallback.discard) fallback.discard = [];
    return fallback.discard;
}

/**
 * Défausse une carte déjà en jeu (zone de soutien, compagnie, champ de bataille,
 * ou attachement). Pas la pile de mort : c’est une défausse, pas une mort.
 */
export function discardCardFromPlay(
    G: GameState,
    card: CardState
): boolean {
    if (!card) return false;
    const targetId = card.instanceId || card.id;
    if (!targetId) return false;

    for (const [playerId, player] of Object.entries(G.players || {})) {
        const removed =
            removeFromList(player.fellowshipArea, targetId) ||
            removeFromList(player.supportArea, targetId);
        if (!removed) continue;
        discardStackedWithHost(G, removed, playerId);
        const pile = ownerDiscardPile(G, playerId, removed);
        if (!pile) return false;
        pile.push(removed);
        return true;
    }

    const fromBattle = removeFromList(G.battlefield, targetId);
    if (fromBattle) {
        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';
        const ownerId =
            fromBattle.kind === 'FREE_PEOPLE' ? fpId : shadowId;
        discardStackedWithHost(G, fromBattle, ownerId);
        const pile = ownerDiscardPile(G, ownerId, fromBattle);
        if (!pile) return false;
        pile.push(fromBattle);
        return true;
    }

    for (const site of G.path || []) {
        if (!site?.attachments?.length && !site?.stacked?.length) continue;
        if (site.attachments?.length) {
            const attachedIndex = site.attachments.findIndex((card) =>
                matchCard(card, targetId)
            );
            if (attachedIndex >= 0) {
                const [removed] = site.attachments.splice(attachedIndex, 1);
                if (!removed) return false;
                const fpId = G.fpPlayerId || '0';
                const shadowId = fpId === '0' ? '1' : '0';
                const ownerId =
                    removed.kind === 'FREE_PEOPLE' ? fpId : shadowId;
                const pile = ownerDiscardPile(G, ownerId, removed);
                if (!pile) return false;
                pile.push(removed);
                return true;
            }
        }
        if (site.stacked?.length) {
            const stackedIndex = site.stacked.findIndex((card) =>
                matchCard(card, targetId)
            );
            if (stackedIndex >= 0) {
                const [removed] = site.stacked.splice(stackedIndex, 1);
                if (!removed) return false;
                const fpId = G.fpPlayerId || '0';
                const shadowId = fpId === '0' ? '1' : '0';
                const ownerId =
                    removed.kind === 'FREE_PEOPLE' ? fpId : shadowId;
                const pile = ownerDiscardPile(G, ownerId, removed);
                if (!pile) return false;
                pile.push(removed);
                return true;
            }
        }
    }

    return false;
}
