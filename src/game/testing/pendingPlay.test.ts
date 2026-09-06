import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import type { Ability } from '../types';

const HALFLING: Ability = {
    id: '1U293:0',
    phases: ['SKIRMISH'],
    cost: [
        {
            exert: [
                {
                    count: 1,
                    target: [['HOBBIT']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [{
        type: 'ADD_TEMP_STAT',
        stat: 'STRENGTH',
        value: 3,
        target: [['HOBBIT']],
        expiresAtPhase: 'SKIRMISH',
    }],
    source: 'SELF',
};

function createHalflingEvent() {
    return createCard({
        id: '1U293',
        kind: 'FREE_PEOPLE',
        type: 'EVENT',
        title: 'Halfling Deftness',
        phases: ['SKIRMISH'],
        twilightCost: 0,
        abilities: [HALFLING],
    });
}

function createSkirmishEngine() {
    return createEngineClient({
        startPhase: 'skirmish',
        playerID: '0',
        G: {
            ...createSkirmishActionWindow('sk-1'),
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'frodo',
                    minionIds: ['orc'],
                },
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                            strength: 3,
                        }),
                        createCompanion({
                            id: 'sam',
                            title: 'Sam',
                            race: 'HOBBIT',
                            vitality: 4,
                            strength: 3,
                        }),
                    ],
                    hand: [createHalflingEvent()],
                }),
            },
        },
    });
}

describe('pendingPlay', () => {
    it('expose l’événement en cours pour les deux joueurs', () => {
        const engine = createSkirmishEngine();

        engine.moves.beginPendingPlay(0, 'Choisissez un Hobbit.');

        const pending = engine.getG().pendingPlay;
        expect(pending?.playerId).toBe('0');
        expect(pending?.card.id).toBe('1U293');
        expect(pending?.handIndex).toBe(0);
        expect(engine.getG().players['0']?.hand).toHaveLength(1);
    });

    it('l’Ombre ne peut pas annuler le pending du FP', () => {
        const engine = createSkirmishEngine();
        engine.moves.beginPendingPlay(0, 'Choisissez un Hobbit.');

        engine.updatePlayerID('1');
        engine.moves.cancelPendingPlay();

        expect(engine.getG().pendingPlay?.card.id).toBe('1U293');
    });

    it('Échap côté joueur actif annule, playCard confirme et vide le pending', () => {
        const engine = createSkirmishEngine();
        engine.moves.beginPendingPlay(0, 'Choisissez un Hobbit.');
        engine.moves.cancelPendingPlay();
        expect(engine.getG().pendingPlay).toBeUndefined();
        expect(engine.getG().players['0']?.hand[0]?.id).toBe('1U293');

        engine.moves.beginPendingPlay(0, 'Choisissez un Hobbit.');
        engine.moves.playCard(0, 'frodo');
        expect(engine.getG().pendingPlay).toBeUndefined();
        expect(engine.getG().players['0']?.hand).toHaveLength(0);
        expect(engine.getG().players['0']?.discard[0]?.id).toBe('1U293');
    });
});
