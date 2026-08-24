// src/hooks/useWoundAudio.ts
import { useEffect, useRef } from 'react';
import type { GameState, CardState } from '../../game/types';
import { audioService } from '../../services/audioService';

export const playCardWoundAudio = (card: CardState) => {
    if (!card) return;
    if (card.race === 'ORC') {
        audioService.play('WOUND_ORC', { delay: 0.3, enablePitch: true });
    } else if (card.race === 'URUK-HAI') {
        audioService.play('WOUND_ORC', { delay: 0.3, pitch: 0.75 });
    } else if (card.race === 'NAZGÛL' || card.race === 'WRAITH') {
        audioService.play('WOUND_WRAITH', { delay: 0.3, enablePitch: true });
    } else if (
        card.race === 'TROLL' ||
        card.race === 'HALF-TROLL' ||
        card.race === 'CREATURE'
    ) {
        audioService.play('WOUND_TROLL', { delay: 0.3, enablePitch: true });
    } else if (card.race === 'BALROG' || card.race === 'MAIA') {
        audioService.play('WOUND_TROLL', { delay: 0.3, enablePitch: true });
    } else if (card.race === 'SPIDER') {
        audioService.play('WOUND_SPIDER', { delay: 0.3, enablePitch: true });
    } else if (card.race === 'ELF') {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay: 0.3 });
        } else {
            audioService.play('WOUND_HUMAN_MALE', { delay: 0.3, pitch: 1.1 });
        }
    } else if (card.race === 'DWARF') {
        audioService.play('WOUND_HUMAN_MALE', { delay: 0.3, pitch: 0.8 });
    } else if (card.race === 'HOBBIT') {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay: 0.3, enablePitch: true });
        } else {
            audioService.play('WOUND_HOBBIT', { delay: 0.3, enablePitch: true });
        }
    } else if (card.race === 'WIZARD') {
        audioService.play('WOUND_WIZARD', { delay: 0.3, enablePitch: true });
    } else if (card.culture === 'GOLLUM') {
        audioService.play('WOUND_GOLLUM', { delay: 0.3, enablePitch: true });
    } else {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay: 0.3, enablePitch: true });
        } else {
            audioService.play('WOUND_HUMAN_MALE', { delay: 0.3, enablePitch: true });
        }
    }
};

export function useWoundAudio(G: GameState) {
    const knownWoundedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const lastWoundedIds = G.lastWoundedCardIds || [];

        // Si le tableau est réinitialisé par le nettoyage visual, on vide aussi notre mémoire
        if (lastWoundedIds.length === 0) {
            knownWoundedIdsRef.current.clear();
            return;
        }

        // Trouver toutes les cartes en jeu pour faire la correspondance ID -> Carte
        const p0 = G.players?.['0'];
        const p1 = G.players?.['1'];

        const allCardsInPlay: CardState[] = [
            ...(p0?.fellowshipArea || []),
            ...(p0?.supportArea || []),
            ...(p1?.fellowshipArea || []),
            ...(p1?.supportArea || []),
            ...(G.battlefield || []),
        ];

        // Chercher le(s) nouvel(s) ID(s) de carte blessée
        lastWoundedIds.forEach((cardId) => {
            if (!knownWoundedIdsRef.current.has(cardId)) {
                // Trouver la carte correspondante
                const woundedCard = allCardsInPlay.find(
                    (c) => c && (c.id === cardId || c.instanceId === cardId)
                );

                if (woundedCard) {
                    playCardWoundAudio(woundedCard);
                }

                knownWoundedIdsRef.current.add(cardId);
            }
        });
    }, [G.lastWoundedCardIds, G.players, G.battlefield]);
}