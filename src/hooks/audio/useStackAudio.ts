import { useEffect, useRef } from 'react';
import type { CardState, GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

/** Empreinte de toutes les cartes empilées (hôtes + sites). */
function stackedFingerprint(G: GameState): string {
    const ids: string[] = [];

    const collectFromCard = (card: CardState | undefined | null) => {
        if (!card) return;
        for (const stacked of card.stacked || []) {
            const id = stacked?.instanceId || stacked?.id;
            if (id) ids.push(id);
        }
        for (const att of card.attachments || []) collectFromCard(att);
    };

    for (const player of Object.values(G.players || {})) {
        if (!player) continue;
        for (const card of player.fellowshipArea || []) collectFromCard(card);
        for (const card of player.supportArea || []) collectFromCard(card);
    }
    for (const card of G.battlefield || []) collectFromCard(card);
    for (const site of G.path || []) {
        if (!site) continue;
        for (const stacked of site.stacked || []) {
            const id = stacked?.instanceId || stacked?.id;
            if (id) ids.push(id);
        }
        for (const att of site.attachments || []) collectFromCard(att);
    }

    return ids.sort().join(',');
}

/**
 * Son CARD_PLAY dès qu’une carte rejoint une pile (Narsil, Web, site…).
 */
export function useStackAudio(G: GameState) {
    const knownRef = useRef<string | null>(null);
    const fingerprint = stackedFingerprint(G);

    useEffect(() => {
        if (knownRef.current === null) {
            knownRef.current = fingerprint;
            return;
        }
        if (fingerprint === knownRef.current) return;

        const prevCount = knownRef.current
            ? knownRef.current.split(',').filter(Boolean).length
            : 0;
        const nextCount = fingerprint
            ? fingerprint.split(',').filter(Boolean).length
            : 0;
        knownRef.current = fingerprint;

        if (nextCount > prevCount) {
            audioService.play('CARD_PLAY');
        }
    }, [fingerprint]);
}
