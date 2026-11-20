import { describe, expect, it } from 'vitest';
import {
    clearStaleInteractionOnPhaseEntry,
    dismissOwnOptionalPromptsAsPass,
    mandatoryPromptBlocksActor,
} from '../logic/interactionCleanup';
import {
    createCard,
    createGameState,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

describe('interactionCleanup', () => {
    it('clearStaleInteractionOnPhaseEntry coupe AW et toasters orphelins', () => {
        const G = createGameState({
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'x',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
            pendingPlay: {
                playerId: '0',
                card: createCard({ id: 'ev', type: 'EVENT' }),
                handIndex: 0,
                prompt: '…',
            },
            pendingWhenPlayed: {
                playerId: '0',
                sourceInstanceId: 'src',
                abilityId: 'a:0',
            },
        });

        clearStaleInteractionOnPhaseEntry(G);

        expect(G.actionWindow).toBeUndefined();
        expect(G.pendingPlay).toBeUndefined();
        expect(G.pendingWhenPlayed).toBeUndefined();
    });

    it('dismissOwnOptionalPromptsAsPass refuse le when-played du joueur', () => {
        const src = createCard({
            id: '1C305',
            instanceId: 'toby',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { supportArea: [src] }),
            },
            pendingWhenPlayed: {
                playerId: '0',
                sourceInstanceId: 'toby',
                abilityId: '1C305:0',
            },
        });

        dismissOwnOptionalPromptsAsPass(G, '0');
        expect(G.pendingWhenPlayed).toBeUndefined();
    });

    it('mandatoryPromptBlocksActor bloque un choix forcé non annulable', () => {
        const ability: Ability = {
            id: 'x:0',
            phases: ['SKIRMISH'],
            cost: [],
            effects: [],
            source: 'SELF',
        };
        void ability;
        const G = createGameState({
            pendingForcedChoice: {
                playerId: '0',
                sourceInstanceId: 'src',
                abilityId: 'x:0',
                cancelable: false,
            },
        });
        expect(mandatoryPromptBlocksActor(G, '0')).toMatch(/choix/);
        expect(mandatoryPromptBlocksActor(G, '1')).toBeNull();
    });
});
