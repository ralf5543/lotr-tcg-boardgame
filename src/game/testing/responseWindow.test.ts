import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

const EOWYN_ABILITY: Ability = {
    id: '4C270:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: [['UNBOUND', 'COMPANION']],
    },
    cost: [
        {
            exert: [{ count: 1, target: 'SELF' }],
            addTwilight: 1,
        },
    ],
    effects: [{ type: 'PREVENT_WOUND' }],
    source: 'SELF',
    text: 'RESPONSE: If an unbound companion is about to take a wound, exert Éowyn and add twilight1 to prevent that wound.',
};

function createEowyn() {
    return createCompanion({
        id: '4C270',
        title: 'Éowyn',
        keywords: ['VALIANT', 'UNBOUND'],
        vitality: 3,
        actionPhases: ['RESPONSE'],
        abilities: [EOWYN_ABILITY],
    });
}

function createUnboundCompanion() {
    return createCompanion({
        id: 'gimli',
        title: 'Gimli',
        keywords: ['UNBOUND'],
        vitality: 3,
    });
}

describe('responseWindow / ABOUT_TO_WOUND', () => {
    it('sans réponse éligible : inflige la blessure tout de suite', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createUnboundCompanion()],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');

        const gimli = engine.getG().players['0']?.fellowshipArea[0];
        expect(gimli?.wounds).toBe(1);
        expect(engine.getG().responseWindow).toBeUndefined();
        expect(engine.getG().pendingEvent).toBeUndefined();
    });

    it('ouvre la fenêtre si Éowyn peut empêcher, sans infliger tout de suite', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createUnboundCompanion(), createEowyn()],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('0');
        expect(G.pendingEvent).toEqual({
            type: 'ABOUT_TO_WOUND',
            targetId: 'gimli',
            remaining: 1,
        });
    });

    it('un Passer unique (seul le FP a une réponse) applique la blessure', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createUnboundCompanion(), createEowyn()],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');
        engine.moves.passResponseWindow();

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
    });

    it('Éowyn empêche la blessure : affaiblie, +1 crépuscule, Gimli intact', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createUnboundCompanion(), createEowyn()],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');
        engine.moves.activateAbility('4C270', '4C270:0');

        const G = engine.getG();
        const gimli = G.players['0']?.fellowshipArea.find((c) => c.id === 'gimli');
        const eowyn = G.players['0']?.fellowshipArea.find((c) => c.id === '4C270');
        expect(gimli?.wounds || 0).toBe(0);
        expect(eowyn?.wounds).toBe(1);
        expect(G.twilightPool).toBe(1);
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
    });

    it('n’ouvre pas la fenêtre si la cible n’est pas unbound (Frodo)', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                title: 'Frodo',
                                keywords: ['RING-BOUND', 'RING-BEARER'],
                                vitality: 4,
                            }),
                            createEowyn(),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.responseWindow).toBeUndefined();
    });
});
