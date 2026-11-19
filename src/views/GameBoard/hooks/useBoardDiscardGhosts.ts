import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CardState, GameState } from '../../../game/types';

/** Aligné sur la main (`discardFlyUp` ~0.45s). */
export const BOARD_DISCARD_GHOST_MS = 450;

export type BoardDiscardGhost = {
    id: string;
    cardKey: string;
    card: CardState;
    top: number;
    left: number;
    width: number;
    height: number;
};

type TrackedInPlay = {
    card: CardState;
    /** Hôte si la carte est un attachement. */
    parentId?: string;
};

function cardKeyOf(card: CardState | undefined | null): string | null {
    if (!card) return null;
    return card.instanceId || card.id || null;
}

/** Exporté pour tests : snapshot des cartes encore en jeu. */
export function collectInPlayCards(G: GameState): Map<string, TrackedInPlay> {
    const map = new Map<string, TrackedInPlay>();

    const add = (card: CardState | undefined | null, parentId?: string) => {
        const key = cardKeyOf(card);
        if (!card || !key || map.has(key)) return;
        map.set(key, { card, parentId });
        for (const att of card.attachments || []) {
            add(att, key);
        }
        for (const stacked of card.stacked || []) {
            add(stacked, key);
        }
    };

    for (const player of Object.values(G.players || {})) {
        if (!player) continue;
        for (const card of player.fellowshipArea || []) add(card);
        for (const card of player.supportArea || []) add(card);
    }
    for (const card of G.battlefield || []) add(card);
    for (const site of G.adventurePath || []) {
        for (const stacked of site.stackedCards || []) add(stacked);
        for (const att of site.attachments || []) add(att);
    }
    return map;
}

function discardKeySet(G: GameState): Set<string> {
    const keys = new Set<string>();
    for (const player of Object.values(G.players || {})) {
        for (const card of player?.discard || []) {
            const key = cardKeyOf(card);
            if (key) keys.add(key);
        }
    }
    return keys;
}

function inPlayFingerprint(map: Map<string, TrackedInPlay>): string {
    return [...map.keys()].sort().join(',');
}

function discardFingerprint(G: GameState): string {
    return Object.keys(G.players || {})
        .sort()
        .map((id) => {
            const pile = G.players[id]?.discard || [];
            return `${id}:${pile
                .map((c) => cardKeyOf(c) || '')
                .filter(Boolean)
                .join(',')}`;
        })
        .join('|');
}

/**
 * Détecte les cartes qui quittent le plateau pour la défausse et expose des
 * fantômes positionnés sur leur dernière place à l’écran (anim côté UI).
 *
 * Important : on recalcule le snapshot à chaque rendu (boardgame.io mute `G`
 * sur place — un `useMemo([G])` resterait périmé).
 */
export function useBoardDiscardGhosts(G: GameState): BoardDiscardGhost[] {
    const [ghosts, setGhosts] = useState<BoardDiscardGhost[]>([]);
    const prevInPlayRef = useRef<Map<string, TrackedInPlay> | null>(null);
    const rectsRef = useRef<Map<string, DOMRect>>(new Map());
    const timeoutsRef = useRef<number[]>([]);

    const inPlay = collectInPlayCards(G);
    const inPlayFp = inPlayFingerprint(inPlay);
    const discardFp = discardFingerprint(G);

    useLayoutEffect(() => {
        document
            .querySelectorAll<HTMLElement>('[data-board-card-id]')
            .forEach((el) => {
                const id = el.getAttribute('data-board-card-id');
                if (!id) return;
                const rect = el.getBoundingClientRect();
                if (rect.width < 2 || rect.height < 2) return;
                rectsRef.current.set(id, rect);
            });
    });

    useEffect(() => {
        const prev = prevInPlayRef.current;
        prevInPlayRef.current = inPlay;
        if (!prev) return;

        const inDiscard = discardKeySet(G);
        const removed: string[] = [];
        for (const key of prev.keys()) {
            if (!inPlay.has(key) && inDiscard.has(key)) {
                removed.push(key);
            }
        }
        if (removed.length === 0) return;

        const removedSet = new Set(removed);
        const spawned: BoardDiscardGhost[] = [];
        const now = Date.now();

        for (const key of removed) {
            const tracked = prev.get(key);
            if (!tracked) continue;
            // Hôte déjà fantômisé : pas de double nuage d’attachements.
            if (tracked.parentId && removedSet.has(tracked.parentId)) {
                continue;
            }
            const rect = rectsRef.current.get(key);
            if (!rect) continue;

            spawned.push({
                id: `${key}-${now}`,
                cardKey: key,
                card: tracked.card,
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            });
        }

        if (spawned.length === 0) return;

        setGhosts((cur) => [...cur, ...spawned]);
        for (const ghost of spawned) {
            const timeoutId = window.setTimeout(() => {
                setGhosts((cur) => cur.filter((g) => g.id !== ghost.id));
                rectsRef.current.delete(ghost.cardKey);
            }, BOARD_DISCARD_GHOST_MS);
            timeoutsRef.current.push(timeoutId);
        }
        // inPlayFp / discardFp = signatures stables (G est souvent muté sur place).
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprints
    }, [inPlayFp, discardFp]);

    useEffect(
        () => () => {
            for (const id of timeoutsRef.current) {
                window.clearTimeout(id);
            }
            timeoutsRef.current = [];
        },
        []
    );

    return ghosts;
}
