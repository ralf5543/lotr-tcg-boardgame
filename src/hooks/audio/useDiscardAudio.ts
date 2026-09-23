import { useEffect, useRef } from 'react';
import type { CardState, GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

function discardFingerprint(G: GameState): string {
    return Object.keys(G.players || {})
        .sort()
        .map((id) => {
            const pile = G.players[id]?.discard || [];
            return `${id}:${pile
                .map((c) => c?.instanceId || c?.id || '')
                .filter(Boolean)
                .join(',')}`;
        })
        .join('|');
}

function cultureTokenTotal(G: GameState): number {
    let total = 0;
    const add = (card: CardState | undefined | null) => {
        if (!card) return;
        const tokens = card.cultureTokens || {};
        for (const n of Object.values(tokens)) {
            if (typeof n === 'number' && n > 0) total += n;
        }
        for (const att of card.attachments || []) add(att);
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
    return total;
}

/**
 * Son CARD_DISCARD dès qu’une carte arrive en défausse (main ou jeu),
 * ou qu’un jeton de culture est retiré — même son, sans délai ni variation.
 */
export function useDiscardAudio(G: GameState) {
    const knownDiscardRef = useRef<string | null>(null);
    const knownTokensRef = useRef<number | null>(null);
    const fingerprint = discardFingerprint(G);
    const tokenTotal = cultureTokenTotal(G);

    useEffect(() => {
        if (knownDiscardRef.current === null) {
            knownDiscardRef.current = fingerprint;
            return;
        }

        if (fingerprint === knownDiscardRef.current) return;

        const countIds = (fp: string) =>
            fp.split('|').reduce((n, part) => {
                const ids = part.split(':').slice(1).join(':');
                return n + (ids ? ids.split(',').filter(Boolean).length : 0);
            }, 0);

        const gained = countIds(fingerprint) > countIds(knownDiscardRef.current);
        knownDiscardRef.current = fingerprint;

        if (gained) {
            audioService.play('CARD_DISCARD', { enablePitch: false });
        }
    }, [fingerprint]);

    useEffect(() => {
        if (knownTokensRef.current === null) {
            knownTokensRef.current = tokenTotal;
            return;
        }
        const prev = knownTokensRef.current;
        knownTokensRef.current = tokenTotal;
        if (tokenTotal < prev) {
            audioService.play('CARD_DISCARD', { enablePitch: false });
        }
    }, [tokenTotal]);
}
