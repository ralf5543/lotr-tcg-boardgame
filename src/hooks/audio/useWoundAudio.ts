// src/hooks/useWoundAudio.ts
import { useEffect, useRef } from 'react';
import type { GameState, CardState } from '../../game/types';
import { audioService } from '../../services/audioService';

export const playCardWoundAudio = (card: CardState, delay = 0.3) => {
    if (!card) return;
    if (card.race === 'ORC') {
        audioService.play('WOUND_ORC', { delay, enablePitch: true });
    } else if (card.race === 'URUK-HAI') {
        audioService.play('WOUND_ORC', { delay, pitch: 0.75 });
    } else if (card.race === 'NAZGÛL' || card.race === 'WRAITH') {
        audioService.play('WOUND_WRAITH', { delay, enablePitch: true });
    } else if (
        card.race === 'TROLL' ||
        card.race === 'HALF-TROLL' ||
        card.race === 'CREATURE'
    ) {
        audioService.play('WOUND_TROLL', { delay, enablePitch: true });
    } else if (card.race === 'BALROG' || card.race === 'MAIA') {
        audioService.play('WOUND_TROLL', { delay, enablePitch: true });
    } else if (card.race === 'SPIDER') {
        audioService.play('WOUND_SPIDER', { delay, enablePitch: true });
    } else if (card.race === 'ELF') {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay });
        } else {
            audioService.play('WOUND_HUMAN_MALE', { delay, pitch: 1.1 });
        }
    } else if (card.race === 'DWARF') {
        audioService.play('WOUND_HUMAN_MALE', { delay, pitch: 0.8 });
    } else if (card.race === 'HOBBIT') {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay, enablePitch: true });
        } else {
            audioService.play('WOUND_HOBBIT', { delay, enablePitch: true });
        }
    } else if (card.race === 'WIZARD') {
        audioService.play('WOUND_WIZARD', { delay, enablePitch: true });
    } else if (card.culture === 'GOLLUM') {
        audioService.play('WOUND_GOLLUM', { delay, enablePitch: true });
    } else {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay, enablePitch: true });
        } else {
            audioService.play('WOUND_HUMAN_MALE', { delay, enablePitch: true });
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

        const lastExertedIds = G.lastExertedCardIds || [];

        // Chercher le(s) nouvel(s) ID(s) de carte blessée
        lastWoundedIds.forEach((cardId) => {
            if (!knownWoundedIdsRef.current.has(cardId)) {
                // Un affaiblissement est aussi une blessure : le cri dédié
                // est géré par useExertAudio, on ne joue pas les deux.
                if (!lastExertedIds.includes(cardId)) {
                    const woundedCard = allCardsInPlay.find(
                        (c) => c && (c.id === cardId || c.instanceId === cardId)
                    );

                    if (woundedCard) {
                        playCardWoundAudio(woundedCard);
                    }
                }

                knownWoundedIdsRef.current.add(cardId);
            }
        });
    }, [G.lastWoundedCardIds, G.lastExertedCardIds, G.players, G.battlefield]);
}