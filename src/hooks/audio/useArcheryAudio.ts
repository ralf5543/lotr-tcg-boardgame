import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

/**
 * Pendant la phase d’archerie, toute blessure (assignation ou capacité)
 * déclenche le son de flèche. Le cri de blessure reste à 0,3 s via useWoundAudio.
 */
export function useArcheryAudio(G: GameState) {
    const knownWoundedIdsRef = useRef<Set<string> | null>(null);

    useEffect(() => {
        if (!G.archeryState) {
            knownWoundedIdsRef.current = null;
            return;
        }

        const lastWoundedIds = G.lastWoundedCardIds || [];

        if (knownWoundedIdsRef.current === null) {
            knownWoundedIdsRef.current = new Set(lastWoundedIds);
            return;
        }

        if (lastWoundedIds.length === 0) {
            knownWoundedIdsRef.current.clear();
            return;
        }

        const hasNewWound = lastWoundedIds.some(
            (id) => !knownWoundedIdsRef.current!.has(id)
        );
        if (hasNewWound) {
            audioService.play('ARROW_IMPACT');
        }

        lastWoundedIds.forEach((id) => knownWoundedIdsRef.current!.add(id));
    }, [G.archeryState, G.lastWoundedCardIds]);
}
