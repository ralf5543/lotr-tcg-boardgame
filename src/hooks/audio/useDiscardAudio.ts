import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
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

/**
 * Son CARD_DISCARD dès qu’une carte arrive en défausse (main ou jeu),
 * sans délai ni variation de hauteur.
 */
export function useDiscardAudio(G: GameState) {
    const knownRef = useRef<string | null>(null);
    const fingerprint = discardFingerprint(G);

    useEffect(() => {
        if (knownRef.current === null) {
            knownRef.current = fingerprint;
            return;
        }

        if (fingerprint === knownRef.current) return;

        const countIds = (fp: string) =>
            fp.split('|').reduce((n, part) => {
                const ids = part.split(':').slice(1).join(':');
                return n + (ids ? ids.split(',').filter(Boolean).length : 0);
            }, 0);

        const gained = countIds(fingerprint) > countIds(knownRef.current);
        knownRef.current = fingerprint;

        if (gained) {
            audioService.play('CARD_DISCARD', { enablePitch: false });
        }
    }, [fingerprint]);
}
