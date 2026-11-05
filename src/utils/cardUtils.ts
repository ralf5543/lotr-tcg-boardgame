import type { GameState, CardState, SiteCardState } from '../game/types';

/** Porteur désigné (mot-clé) ou compagnon qui a l’Anneau Unique attaché. */
export function isRingBearerCard(card: CardState | null | undefined): boolean {
    if (!card) return false;
    if ((card.keywords || []).includes('RING-BEARER')) return true;
    return (card.attachments || []).some((att) => att?.type === 'RING');
}

/** True si `cardId` désigne une carte (ou attachement) de l’aire de soutien. */
export function isCardInSupportArea(
    G: GameState,
    cardId: string | null | undefined
): boolean {
    if (!G?.players || !cardId) return false;
    const match = (c: CardState | undefined | null) =>
        Boolean(c && (c.instanceId === cardId || c.id === cardId));
    for (const player of Object.values(G.players)) {
        if (!player) continue;
        for (const card of player.supportArea || []) {
            if (match(card)) return true;
            if ((card.attachments || []).some(match)) return true;
            if ((card.stacked || []).some(match)) return true;
        }
    }
    return false;
}

/**
 * Siège propriétaire d’une carte en jeu (aire de soutien / communauté / attachements).
 * Champ de bataille → joueur Ombre actuel. Sites → undefined (partagés).
 */
export function findInPlayCardOwnerId(
    G: GameState,
    card: CardState | null | undefined
): string | undefined {
    if (!G?.players || !card) return undefined;
    const match = (c: CardState | undefined | null) =>
        Boolean(
            c &&
                (c === card ||
                    (c.instanceId &&
                        card.instanceId &&
                        c.instanceId === card.instanceId) ||
                    (c.instanceId || c.id) === (card.instanceId || card.id))
        );

    for (const pId of Object.keys(G.players)) {
        const player = G.players[pId];
        if (!player) continue;
        for (const zone of [player.supportArea, player.fellowshipArea]) {
            for (const c of zone || []) {
                if (match(c)) return pId;
                if ((c.attachments || []).some(match)) return pId;
                if ((c.stacked || []).some(match)) return pId;
                for (const att of c.attachments || []) {
                    if ((att?.stacked || []).some(match)) return pId;
                }
            }
        }
    }

    for (const char of G.battlefield || []) {
        if (match(char) || (char.attachments || []).some(match)) {
            const fpId = G.fpPlayerId || '0';
            return fpId === '0' ? '1' : '0';
        }
    }

    return undefined;
}

/**
 * Recherche une carte par son ID dynamique dans l'ensemble des zones du jeu
 */
export function findTargetCard(
    G: GameState,
    targetId: string
): CardState | SiteCardState | null {
    if (!G || !G.players || !targetId) return null;

    // Helper interne pour comparer id OU instanceId
    const match = (c: CardState | undefined | null) =>
        c && (c.instanceId === targetId || c.id === targetId);

    // 1. Aires des joueurs (Fellowship & Support)
    for (const pId of Object.keys(G.players)) {
        const player = G.players[pId];
        if (!player) continue;

        for (const card of player.supportArea || []) {
            if (match(card)) return card;
            const attached = card.attachments?.find(match);
            if (attached) return attached;
            const stacked = card.stacked?.find(match);
            if (stacked) return stacked;
            for (const att of card.attachments || []) {
                const attStacked = att?.stacked?.find(match);
                if (attStacked) return attStacked;
            }
        }

        for (const char of player.fellowshipArea || []) {
            if (match(char)) return char;
            const attached = char.attachments?.find(match);
            if (attached) return attached;
            const stacked = char.stacked?.find(match);
            if (stacked) return stacked;
        }
    }

    // 2. Champ de Bataille
    for (const char of G.battlefield || []) {
        if (match(char)) return char;
        const attached = char.attachments?.find(match);
        if (attached) return attached;
    }

    // 3. Path (Sites + conditions attachées + séides empilés)
    for (const site of G.path || []) {
        if (!site) continue;
        if (match(site as any)) return site;
        const attached = site.attachments?.find(match);
        if (attached) return attached;
        const stacked = site.stacked?.find(match);
        if (stacked) return stacked;
    }

    return null;
}
