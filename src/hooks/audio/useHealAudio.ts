import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

export function useHealAudio(G: GameState) {
    const knownHealedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const lastHealedIds = G.lastHealedCardIds || [];

        if (lastHealedIds.length === 0) {
            knownHealedIdsRef.current.clear();
            return;
        }

        lastHealedIds.forEach((cardId, index) => {
            if (knownHealedIdsRef.current.has(cardId)) return;
            knownHealedIdsRef.current.add(cardId);
            // Décalage : le debounce du service (150 ms) sinon n’en joue qu’un.
            window.setTimeout(() => {
                audioService.play('HEAL');
            }, index * 160);
        });
    }, [G.lastHealedCardIds]);
}
