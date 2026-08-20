import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

export function useArcheryAudio(G: GameState) {
    const prevRemainingWoundsRef = useRef<number | null>(null);

    useEffect(() => {
        if (!G.archeryState) {
            prevRemainingWoundsRef.current = null;
            return;
        }

        const fpRemaining = G.archeryState.fpRemainingWounds ?? 0;
        const shadowRemaining = G.archeryState.shadowRemainingWounds ?? 0;
        const totalRemaining = fpRemaining + shadowRemaining;

        // Premier passage dans la phase d'archerie : on initialise la référence sans jouer de son
        if (prevRemainingWoundsRef.current === null) {
            prevRemainingWoundsRef.current = totalRemaining;
            return;
        }

        // Dès que le nombre de blessures restantes diminue -> Un tir a été assigné !
        if (totalRemaining < prevRemainingWoundsRef.current) {
            audioService.play('ARROW_IMPACT');
        }

        prevRemainingWoundsRef.current = totalRemaining;
    }, [G.archeryState?.fpRemainingWounds, G.archeryState?.shadowRemainingWounds]);
}