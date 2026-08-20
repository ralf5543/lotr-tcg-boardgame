// src/hooks/useAssignmentAudio.ts
import { useEffect, useRef } from 'react';
import type { GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

export function useAssignmentAudio(G: GameState) {
    const prevAssignmentsCountRef = useRef<number | null>(null);

    useEffect(() => {
        const skirmishes = G.skirmishes || [];
        const totalMinionsAssigned = skirmishes.reduce(
            (sum, s) => sum + (s.minionIds?.length || 0),
            0
        );

        // Premier passage : initialisation de la référence
        if (prevAssignmentsCountRef.current === null) {
            prevAssignmentsCountRef.current = totalMinionsAssigned;
            return;
        }

        // Dès que le nombre total d'assignations change -> Un séide a été assigné !
        if (totalMinionsAssigned !== prevAssignmentsCountRef.current && totalMinionsAssigned > 0) {
            audioService.play('ASSIGNMENT', { pitch: 0.5 });
        }

        prevAssignmentsCountRef.current = totalMinionsAssigned;
    }, [G.skirmishes]);
}