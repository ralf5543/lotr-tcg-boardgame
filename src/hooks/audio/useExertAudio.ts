import { useEffect, useRef } from 'react';
import type { GameState, CardState } from '../../game/types';
import { audioService } from '../../services/audioService';
import { playCardWoundAudio } from './useWoundAudio';

export const playCardExertAudio = (card: CardState) => {
    if (!card) return;

    if (card.culture === 'GOLLUM') {
        audioService.play('EXERT_GOLLUM', { enablePitch: true });
        return;
    }

    if (card.kind === 'FREE_PEOPLE') {
        if (card.race === 'DWARF') {
            audioService.play('EXERT_HUMAN_MALE', { pitch: 0.8 });
        } else if (card.race === 'ELF' && !card.isFemale) {
            audioService.play('EXERT_HUMAN_MALE', { pitch: 1.1 });
        } else if (card.race === 'HOBBIT' && !card.isFemale) {
            audioService.play('EXERT_HUMAN_MALE', { pitch: 1.1 });
        } else if (card.isFemale) {
            audioService.play('EXERT_HUMAN_FEMALE', { enablePitch: true });
        } else {
            audioService.play('EXERT_HUMAN_MALE', { enablePitch: true });
        }
        return;
    }

    playCardWoundAudio(card, 0);
};

export function useExertAudio(G: GameState) {
    const knownExertedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const lastExertedIds = G.lastExertedCardIds || [];

        if (lastExertedIds.length === 0) {
            knownExertedIdsRef.current.clear();
            return;
        }

        const p0 = G.players?.['0'];
        const p1 = G.players?.['1'];

        const allCardsInPlay: CardState[] = [
            ...(p0?.fellowshipArea || []),
            ...(p0?.supportArea || []),
            ...(p1?.fellowshipArea || []),
            ...(p1?.supportArea || []),
            ...(G.battlefield || []),
        ];

        lastExertedIds.forEach((cardId) => {
            if (!knownExertedIdsRef.current.has(cardId)) {
                const exertedCard = allCardsInPlay.find(
                    (c) => c && (c.id === cardId || c.instanceId === cardId)
                );

                if (exertedCard) {
                    playCardExertAudio(exertedCard);
                }

                knownExertedIdsRef.current.add(cardId);
            }
        });
    }, [G.lastExertedCardIds, G.players, G.battlefield]);
}
