// src/hooks/useCardPlayAudio.ts
import { useEffect, useRef } from 'react';
import type { CardState, GameState } from '../../game/types';
import { audioService } from '../../services/audioService';

function getCardSoundPath(card: CardState): string | undefined {
    if (!card) return undefined;
    const cardType = card.type;
    const cardSubtype = card.subtype;

    if (cardType === 'COMPANION' || cardType === 'ALLY') {
        return 'COMPANION';
    } else if (cardType === 'MINION') {
        return 'MINION';
    } else if (cardType === 'POSSESSION') {
        return cardSubtype ? `POSSESSION_${cardSubtype}` : 'POSSESSION';
    }
    return undefined;
}

export function useCardPlayAudio(G: GameState) {
    const knownCardIdsRef = useRef<Set<string> | null>(null);

    useEffect(() => {
        const p0 = G.players?.['0'];
        const p1 = G.players?.['1'];

        const rawBoardCards: CardState[] = [
            ...(p0?.fellowshipArea || []),
            ...(p0?.supportArea || []),
            ...(p1?.fellowshipArea || []),
            ...(p1?.supportArea || []),
            ...(G.battlefield || []),
        ];

        const collectWithAttachments = (list: CardState[]): CardState[] => {
            const acc: CardState[] = [];
            const walk = (c: CardState) => {
                if (!c) return;
                acc.push(c);
                if (Array.isArray(c.attachments)) {
                    c.attachments.forEach(walk);
                }
            };
            list.forEach(walk);
            return acc;
        };

        const currentInPlay = collectWithAttachments(rawBoardCards);
        const currentIds = new Set(
            currentInPlay.map((c) => c.instanceId || c.id).filter(Boolean)
        );

        if (knownCardIdsRef.current === null) {
            knownCardIdsRef.current = currentIds;
            return;
        }

        const newCard = currentInPlay.find(
            (c) => c && !knownCardIdsRef.current?.has(c.instanceId || c.id)
        );

        if (newCard) {

            audioService.play('CARD_PLAY');

            const soundPath = getCardSoundPath(newCard);
            if (soundPath) {
                audioService.play(soundPath, { delay: 0.3 });
            }
        }

        knownCardIdsRef.current = currentIds;
    }, [G.players, G.battlefield]);
}