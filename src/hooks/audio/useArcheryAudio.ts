import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

const ARCHERY_AUDIO_STEPS = new Set([
    'ACTIONS',
    'FP_ASSIGN',
    'SHADOW_ASSIGN',
    'COMPLETE',
]);

/**
 * Pendant la phase d’archerie, toute blessure d’archerie (assignation ou capacité)
 * déclenche le son de flèche. Un affaiblissement (exert) n’en déclenche pas.
 * Le cri de blessure reste à 0,3 s via useWoundAudio.
 *
 * La dernière flèche d’Ombre termine souvent la phase dans le même update
 * (archeryState disparaît). On joue quand même si on suivait déjà l’archerie.
 */
export function useArcheryAudio(G: GameState) {
    const knownWoundedIdsRef = useRef<Set<string> | null>(null);

    useEffect(() => {
        const step = G.archeryState?.step;
        const inArchery = Boolean(step && ARCHERY_AUDIO_STEPS.has(step));
        const lastWoundedIds = G.lastWoundedCardIds || [];
        const lastExertedIds = G.lastExertedCardIds || [];

        if (knownWoundedIdsRef.current === null) {
            if (!inArchery) return;
            knownWoundedIdsRef.current = new Set(lastWoundedIds);
            return;
        }

        if (lastWoundedIds.length === 0) {
            knownWoundedIdsRef.current.clear();
            if (!inArchery) knownWoundedIdsRef.current = null;
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

        if (!inArchery) {
            knownWoundedIdsRef.current = null;
        }
    }, [G.archeryState, G.lastWoundedCardIds, G.lastExertedCardIds]);
}
