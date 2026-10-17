import { describe, expect, it } from 'vitest';
import { applyStartOfManeuverSiteTriggers } from '../engine/abilities/startOfManeuver';
import { resolveForcedChoice } from '../engine/abilities/startOfSkirmish';
import type { Ability } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const PELENNOR_ABILITY: Ability = {
    id: '11S254:0:site-start-maneuver',
    phases: ['START_OF_MANEUVER'],
    cost: [],
    effects: [
        {
            type: 'CHOOSE_ONE',
            chooser: 'FREE_PEOPLE',
            options: [
                {
                    label: 'Ajouter un fardeau',
                    effects: [{ type: 'ADD_BURDENS', count: 1 }],
                },
                {
                    label: 'Défausser 3 cartes de sa main',
                    effects: [{ type: 'DISCARD_FROM_HAND', count: 3 }],
                },
            ],
        },
    ],
    source: 'SELF',
    text: 'At the start of the maneuver phase, the Free Peoples player must add a burden or discard 3 cards from hand.',
};

describe('Pelennor Flat — startOfManeuver', () => {
    it('ouvre le choix forcé sans dual-wait startOfPhase (évite double toaster bloqué)', () => {
        const pelennor = createSite({
            id: '11S254',
            instanceId: 'pelennor-1',
            name: 'Pelennor Flat',
            siteNumber: 3,
            ownerId: '1',
            abilities: [PELENNOR_ABILITY],
        });
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({
                id: `path-${i}`,
                siteNumber: i + 1,
                ownerId: i === 0 ? '0' : '1',
            })
        );
        path[2] = pelennor;

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                path,
                currentSiteIndex: 2,
                battlefield: [createMinion({ id: 'm1' })],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 2,
                        burdens: 0,
                        fellowshipArea: [createCompanion({ id: 'c1' })],
                        hand: [
                            createCompanion({ id: 'h1' }),
                            createCompanion({ id: 'h2' }),
                            createCompanion({ id: 'h3' }),
                        ],
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 2 }),
                },
            },
        });

        engine.moves.endShadowPhase();

        const G = engine.getG();
        expect(engine.getCtx().phase).toBe('startOfManeuver');
        expect(G.pendingForcedChoice).toMatchObject({
            playerId: '0',
            abilityId: PELENNOR_ABILITY.id,
            sourceInstanceId: 'pelennor-1',
        });
        // Pas de dual-wait tant que le choix site n’est pas résolu.
        expect(G.startOfPhaseState).toBeUndefined();

        engine.stop();
    });

    it('résout le choix forcé et libère pendingForcedChoice', () => {
        const pelennor = {
            ...createSite({
                id: '11S254',
                instanceId: 'pelennor-2',
                name: 'Pelennor Flat',
                siteNumber: 3,
                ownerId: '1',
            }),
            abilities: [PELENNOR_ABILITY],
        };
        const G = createGameState({
            path: [null, null, pelennor, null, null, null, null, null, null],
            currentSiteIndex: 2,
            fpPlayerId: '0',
            maneuverStep: 'MANEUVER_START',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 2,
                    burdens: 1,
                    fellowshipArea: [createCompanion({ id: 'c1' })],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 2 }),
            },
        });

        expect(applyStartOfManeuverSiteTriggers(G)).toBe(true);
        expect(resolveForcedChoice(G, '0', 0)).toBe(true);
        expect(G.pendingForcedChoice).toBeUndefined();
        expect(G.players['0']?.burdens).toBe(2);
    });
});
