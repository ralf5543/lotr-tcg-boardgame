// src/hooks/useCardPlayAudio.ts
import { useEffect, useRef } from 'react';
import type { CardState, GameState } from '../game/types';
import { audioService } from '../services/audioService';

/**
 * Détermine le chemin audio spécifique à un type de carte
 */
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

// Variable hors-composant pour conserver la mémoire des cartes chargées au premier rendu
const knownPlayedCardIdsRef = { current: null as Set<string> | null };

export function useCardPlayAudio(G: GameState) {
    useEffect(() => {
        const p0 = G.players?.['0'];
        const p1 = G.players?.['1'];

        // 1. Rassemblement de toutes les cartes sur le plateau
        const rawBoardCards: CardState[] = [
            ...(p0?.fellowshipArea || []),
            ...(p0?.supportArea || []),
            ...(p1?.fellowshipArea || []),
            ...(p1?.supportArea || []),
            ...(G.battlefield || []),
        ];

        // Extraction récursive incluant les attachements (armes, objets, etc.)
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

        // Au chargement initial de la page / partie, on enregistre l'état sans jouer de son
        if (knownPlayedCardIdsRef.current === null) {
            knownPlayedCardIdsRef.current = currentIds;
            return;
        }

        // 2. Recherche d'une nouvelle carte apparue dans le State G
        const newCard = currentInPlay.find(
            (c) =>
                c && !knownPlayedCardIdsRef.current?.has(c.instanceId || c.id)
        );

        if (newCard) {
            // Déclenchement audio synchrone pour les deux joueurs !
            audioService.play('CARD_PLAY');

            const soundPath = getCardSoundPath(newCard);
            if (soundPath) {
                audioService.play(soundPath, { delay: 0.3 });
            }
        }

        // Mise à jour de la mémoire d'IDs
        knownPlayedCardIdsRef.current = currentIds;
    }, [G.players, G.battlefield]);
}