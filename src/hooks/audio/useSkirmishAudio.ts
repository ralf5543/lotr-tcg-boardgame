import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

/** Blessure infligée (pas un affaiblissement) pas encore traitée pour le bruit d’impact. */
export function hasNewInflictedWound(
    lastWoundedIds: string[],
    lastExertedIds: string[],
    alreadyHeard: Set<string>
): boolean {
    return lastWoundedIds.some(
        (id) => !alreadyHeard.has(id) && !lastExertedIds.includes(id)
    );
}

export function useSkirmishAudio(G: GameState, phase?: string) {
    const lastClashIdRef = useRef<string | null>(null);
    const smashedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!G.activeSkirmishId) {
            lastClashIdRef.current = null;
            return;
        }

        if (G.activeSkirmishId !== lastClashIdRef.current) {
            lastClashIdRef.current = G.activeSkirmishId;
            audioService.play('SKIRMISH');
        }
    }, [G.activeSkirmishId]);

    useEffect(() => {
        if (phase !== 'skirmish') {
            smashedIdsRef.current.clear();
            return;
        }

        const lastWoundedIds = G.lastWoundedCardIds || [];
        const lastExertedIds = G.lastExertedCardIds || [];

        if (lastWoundedIds.length === 0) {
            smashedIdsRef.current.clear();
            return;
        }

        if (
            hasNewInflictedWound(
                lastWoundedIds,
                lastExertedIds,
                smashedIdsRef.current
            )
        ) {
            audioService.play('SMASH', { enablePitch: true });
        }

        lastWoundedIds.forEach((id) => smashedIdsRef.current.add(id));
    }, [phase, G.lastWoundedCardIds, G.lastExertedCardIds]);
}
