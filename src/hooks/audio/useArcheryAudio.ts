import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

const ARCHERY_AUDIO_STEPS = new Set(['ACTIONS', 'FP_ASSIGN', 'SHADOW_ASSIGN']);

/**
 * Pendant la phase d’archerie, toute blessure d’archerie (assignation ou capacité)
 * déclenche le son de flèche. Un affaiblissement (exert) n’en déclenche pas.
 * Le cri de blessure reste à 0,3 s via useWoundAudio.
 */
export function useArcheryAudio(G: GameState) {
    const knownWoundedIdsRef = useRef<Set<string> | null>(null);

    useEffect(() => {
        const step = G.archeryState?.step;
        if (!step || !ARCHERY_AUDIO_STEPS.has(step)) {
            knownWoundedIdsRef.current = null;
            return;
        }

        const lastWoundedIds = G.lastWoundedCardIds || [];
        const lastExertedIds = G.lastExertedCardIds || [];

        if (knownWoundedIdsRef.current === null) {
            knownWoundedIdsRef.current = new Set(lastWoundedIds);
            return;
        }

        if (lastWoundedIds.length === 0) {
            knownWoundedIdsRef.current.clear();
            return;
        }

        const hasNewArcheryWound = lastWoundedIds.some(
            (id) =>
                !knownWoundedIdsRef.current!.has(id) &&
                !lastExertedIds.includes(id)
        );
        if (hasNewArcheryWound) {
            audioService.play('ARROW_IMPACT');
        }

        lastWoundedIds.forEach((id) => knownWoundedIdsRef.current!.add(id));
    }, [G.archeryState, G.lastWoundedCardIds, G.lastExertedCardIds]);
}
