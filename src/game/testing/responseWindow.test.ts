import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
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

const ONE_RING_ABILITY: Ability = {
    id: '1R1:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: 'BEARER',
    },
    cost: [],
    effects: [
        {
            type: 'WEAR_RING',
            expiresAtPhase: 'REGROUP',
            replaceWoundWithBurdens: 2,
        },
    ],
    source: 'ATTACHMENT',
    text: 'RESPONSE: If bearer is about to take a wound, he wears The One Ring until the regroup phase.',
};

const RULING_RING_ABILITY: Ability = {
    id: '1C2:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: 'BEARER',
        inSkirmish: true,
    },
    cost: [],
    effects: [
        {
            type: 'WEAR_RING',
            expiresAtPhase: 'REGROUP',
            replaceWoundWithBurdens: 1,
            onlyInSkirmish: true,
        },
    ],
    source: 'ATTACHMENT',
    text: 'RESPONSE: If bearer is about to take a wound in a skirmish, he wears The One Ring until the regroup phase.',
};

function createTheOneRing(ability: Ability = ONE_RING_ABILITY) {
    return createCard({
        id: ability.id.split(':')[0],
        title: 'The One Ring',
        type: 'RING',
        kind: 'FREE_PEOPLE',
        actionPhases: ['RESPONSE'],
        abilities: [ability],
    });
}

function createFrodoWithRing(ability: Ability = ONE_RING_ABILITY) {
    return createCompanion({
        id: 'frodo',
        title: 'Frodo',
        keywords: ['RING-BOUND', 'RING-BEARER'],
        vitality: 4,
        attachments: [createTheOneRing(ability)],
    });
}

describe('responseWindow / Anneau Unique', () => {
    it('ouvre la fenêtre si on peut mettre l’Anneau, sans blesser tout de suite', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing()],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.players['0']?.burdens).toBe(0);
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.wearingTheOneRing).toBeUndefined();
        expect(G.pendingEvent).toEqual({
            type: 'ABOUT_TO_WOUND',
            targetId: 'frodo',
            remaining: 1,
        });
    });

    it('mettre l’Anneau : porté jusqu’au ralliement, 2 fardeaux, pas de blessure', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing()],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');
        engine.moves.activateAbility('1R1', '1R1:0');

        const G = engine.getG();
        const frodo = G.players['0']?.fellowshipArea[0];
        expect(frodo?.wounds || 0).toBe(0);
        expect(G.players['0']?.burdens).toBe(2);
        expect(G.wearingTheOneRing).toEqual({
            expiresAtPhase: 'REGROUP',
            replaceWoundWithBurdens: 2,
        });
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
    });

    it('déjà porté : pas de toaster, 2 fardeaux tout de suite', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                wearingTheOneRing: {
                    expiresAtPhase: 'REGROUP',
                    replaceWoundWithBurdens: 2,
                },
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing()],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.players['0']?.burdens).toBe(2);
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
    });

    it('Passer : blessure normale, Anneau pas porté', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing()],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');
        engine.moves.passResponseWindow();

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.players['0']?.burdens).toBe(0);
        expect(G.wearingTheOneRing).toBeUndefined();
        expect(G.responseWindow).toBeUndefined();
    });

    it('après l’avoir mis, une 2e blessure = fardeaux sans toaster', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing()],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');
        engine.moves.activateAbility('1R1', '1R1:0');
        engine.moves.applyWound('frodo');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.players['0']?.burdens).toBe(4);
        expect(G.responseWindow).toBeUndefined();
    });

    it('The Ruling Ring : pas de fenêtre hors escarmouche (archerie)', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing(RULING_RING_ABILITY)],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.players['0']?.burdens).toBe(0);
        expect(G.responseWindow).toBeUndefined();
    });

    it('The Ruling Ring : fenêtre en escarmouche, 1 fardeau à la place', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                activeSkirmishId: 'sk-frodo',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing(RULING_RING_ABILITY)],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');
        engine.moves.activateAbility('1C2', '1C2:0');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.players['0']?.burdens).toBe(1);
        expect(G.wearingTheOneRing?.onlyInSkirmish).toBe(true);
        expect(G.responseWindow).toBeUndefined();
    });

    it('n’ouvre pas la fenêtre si c’est un autre compagnon qui est blessé', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createFrodoWithRing(),
                            createUnboundCompanion(),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[1]?.wounds).toBe(1);
        expect(G.players['0']?.burdens).toBe(0);
        expect(G.responseWindow).toBeUndefined();
        expect(G.wearingTheOneRing).toBeUndefined();
    });

    it('retire l’Anneau au début du ralliement', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing()],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');
        engine.moves.activateAbility('1R1', '1R1:0');
        expect(engine.getG().wearingTheOneRing).toBeDefined();

        engine.moves.devSetPhase('startOfRegroup');
        expect(engine.getG().wearingTheOneRing).toBeUndefined();
    });

    it('fardeaux à la place en combat : cleanup clôture l’escarmouche', () => {
        const frodo = createFrodoWithRing();
        frodo.strength = 3;
        const orc = createMinion({
            id: 'orc',
            strength: 5,
            vitality: 2,
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                wearingTheOneRing: {
                    expiresAtPhase: 'REGROUP',
                    replaceWoundWithBurdens: 2,
                },
                activeSkirmishId: 'sk-frodo',
                skirmishes: [
                    {
                        id: 'sk-frodo',
                        companionId: 'frodo',
                        minionIds: ['orc'],
                    },
                ],
                battlefield: [orc],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();

        const afterResolve = engine.getG();
        expect(afterResolve.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(
            0
        );
        expect(afterResolve.players['0']?.burdens).toBe(2);
        expect(afterResolve.responseWindow).toBeUndefined();
        expect(afterResolve.activeSkirmishId).toBe('sk-frodo');
        expect(afterResolve.skirmishes[0]?.resolved).toBe(true);

        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().activeSkirmishId).toBeUndefined();
        expect(engine.getG().skirmishes).toHaveLength(0);
    });

    it('mettre l’Anneau pendant le combat, puis cleanup clôture l’escarmouche', () => {
        const frodo = createFrodoWithRing();
        frodo.strength = 3;
        const orc = createMinion({
            id: 'orc',
            strength: 5,
            vitality: 2,
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                activeSkirmishId: 'sk-frodo',
                skirmishes: [
                    {
                        id: 'sk-frodo',
                        companionId: 'frodo',
                        minionIds: ['orc'],
                    },
                ],
                battlefield: [orc],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        expect(engine.getG().responseWindow?.isOpen).toBe(true);

        engine.moves.activateAbility('1R1', '1R1:0');

        const afterRing = engine.getG();
        expect(afterRing.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(afterRing.players['0']?.burdens).toBe(2);
        expect(afterRing.responseWindow).toBeUndefined();
        expect(afterRing.activeSkirmishId).toBe('sk-frodo');

        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().activeSkirmishId).toBeUndefined();
        expect(engine.getG().skirmishes).toHaveLength(0);
    });
});
