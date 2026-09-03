import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

export function useSkirmishAudio(G: GameState) {
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
        const skirmishes = G.skirmishes || [];
        const currentIds = new Set(skirmishes.map((s) => s.id));

        for (const id of smashedIdsRef.current) {
            if (!currentIds.has(id)) {
                smashedIdsRef.current.delete(id);
            }
        }

        skirmishes.forEach((skirmish) => {
            if (!skirmish.resolved || smashedIdsRef.current.has(skirmish.id)) {
                return;
            }
            smashedIdsRef.current.add(skirmish.id);
            audioService.play('SMASH', { enablePitch: true });
        });
    }, [G.skirmishes]);
}
