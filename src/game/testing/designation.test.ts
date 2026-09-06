import { describe, expect, it } from 'vitest';
import {
    abilityNeedsDesignation,
    getDesignationCandidates,
    getHandEventDesignationTargetIds,
    isDesignationTargetId,
} from '../engine/abilities/designation';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createMinion,
    createGameState,
    createPlayerState,
} from './createGameState';

const SAM_ABILITY: Ability = {
    id: '4R307:0',
    phases: ['SKIRMISH'],
    cost: [{ exert: [{ count: 1, target: [['Sam']] }] }],
    effects: [{
        type: 'ADD_TEMP_STAT',
        stat: 'STRENGTH',
        value: 3,
        target: [['Sam']],
        expiresAtPhase: 'SKIRMISH',
    }],
    source: 'SELF',
};

const HOBBIT_ABILITY: Ability = {
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

describe('designation', () => {
    const event = createCard({
        id: 'event',
        kind: 'FREE_PEOPLE',
        type: 'EVENT',
        title: 'Test Event',
    });

    it('Exert Sam nommé : le joueur désigne, le Sam dormant de l’Ombre est ignoré', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: '1C311',
                            title: 'Sam',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
                '1': createPlayerState('1', {
                    fellowshipArea: [
                        createCompanion({
                            id: '11U172',
                            title: 'Sam',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });

        expect(abilityNeedsDesignation(G, event, SAM_ABILITY)).toBe(true);
        const candidates = getDesignationCandidates(G, event, SAM_ABILITY);
        expect(candidates).toHaveLength(1);
        expect(candidates[0]?.id).toBe('1C311');
    });

    it('un Hobbit : le joueur doit quand même désigner', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });

        expect(abilityNeedsDesignation(G, event, HOBBIT_ABILITY)).toBe(true);
        expect(getDesignationCandidates(G, event, HOBBIT_ABILITY)).toHaveLength(
            1
        );
    });

    it('deux Hobbits : le joueur doit désigner', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                        createCompanion({
                            id: 'sam',
                            title: 'Sam',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });

        expect(abilityNeedsDesignation(G, event, HOBBIT_ABILITY)).toBe(true);
        expect(getDesignationCandidates(G, event, HOBBIT_ABILITY)).toHaveLength(
            2
        );
    });

    it('blesser un séide : désignation même s’il n’y en a qu’un', () => {
        const G = createGameState({
            battlefield: [createMinion({ id: 'orc', vitality: 3 })],
        });
        const ability: Ability = {
            id: '1R50:0',
            phases: ['ARCHERY'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [{ type: 'WOUND', count: 1, target: [['MINION']] }],
            source: 'SELF',
        };
        const source = createCompanion({ id: '1R50', title: 'Legolas' });
        expect(abilityNeedsDesignation(G, source, ability)).toBe(true);
        expect(getDesignationCandidates(G, source, ability)).toHaveLength(1);
    });

    it('event en main : IDs de désignation pour la flèche', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });
        const eventCard = createCard({
            id: '1U293',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Halfling Deftness',
            phases: ['SKIRMISH'],
            twilightCost: 0,
            abilities: [HOBBIT_ABILITY],
        });

        expect(
            getHandEventDesignationTargetIds(G, eventCard, 'skirmish')
        ).toContain('frodo');
        expect(
            getHandEventDesignationTargetIds(G, eventCard, 'fellowship')
        ).toEqual([]);
        expect(isDesignationTargetId(['frodo'], 'frodo')).toBe(true);
        expect(isDesignationTargetId(['frodo'], 'sam')).toBe(false);
    });
});
