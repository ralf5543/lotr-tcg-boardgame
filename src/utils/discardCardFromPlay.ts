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
        if (!host?.attachments) continue;
        const attachedIndex = host.attachments.findIndex((card) =>
            matchCard(card, targetId)
        );
        if (attachedIndex >= 0) {
            const [removed] = host.attachments.splice(attachedIndex, 1);
            return removed || null;
        }
    }
    return null;
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
        const pile = ownerDiscardPile(G, playerId, removed);
        if (!pile) return false;
        pile.push(removed);
        return true;
    }

    const fromBattle = removeFromList(G.battlefield, targetId);
    if (!fromBattle) return false;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const ownerId =
        fromBattle.kind === 'FREE_PEOPLE' ? fpId : shadowId;
    const pile = ownerDiscardPile(G, ownerId, fromBattle);
    if (!pile) return false;
    pile.push(fromBattle);
    return true;
}
