import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import { collectVisibleAbilities } from '../engine/abilities/collectAbilities';

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

    it('Frodon 2C102 sans mot-clé RING-BEARER : mettre l’Anneau en combat remplace la blessure', () => {
        const frodo = createCompanion({
            id: '2C102',
            title: 'Frodo',
            keywords: ['RING-BOUND'],
            vitality: 4,
            strength: 3,
            attachments: [createTheOneRing()],
        });
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
                        companionId: '2C102',
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

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.players['0']?.burdens).toBe(2);
        expect(G.wearingTheOneRing).toEqual({
            expiresAtPhase: 'REGROUP',
            replaceWoundWithBurdens: 2,
        });
        expect(G.responseWindow).toBeUndefined();
    });
});

const INTIMIDATE_ABILITY: Ability = {
    id: '1C76:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: [['COMPANION']],
    },
    cost: [{ spot: [{ count: 1, target: [['Gandalf']] }] }],
    effects: [{ type: 'PREVENT_WOUND' }],
    source: 'SELF',
};

const GOBLIN_ARMORY_ABILITY: Ability = {
    id: '1R173:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: [['MORIA', 'ORC']],
    },
    cost: [{ discardFromPlay: [{ count: 1, target: 'SELF' }] }],
    effects: [{ type: 'PREVENT_WOUND' }],
    source: 'SELF',
};

const HIDES_TWILIGHT_ABILITY: Ability = {
    id: '4R19:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: [['DUNLAND', 'MAN']],
    },
    cost: [{ removeTwilight: 2 }],
    effects: [{ type: 'PREVENT_WOUND' }],
    source: 'SELF',
};

const HIDES_DISCARD_ABILITY: Ability = {
    id: '4R19:1',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: [['DUNLAND', 'MAN']],
    },
    cost: [{ discardFromPlay: [{ count: 1, target: 'SELF' }] }],
    effects: [{ type: 'PREVENT_WOUND' }],
    source: 'SELF',
};

const SHAMAN_ABILITY: Ability = {
    id: '3C59:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: [['ISENGARD', 'ORC']],
    },
    cost: [{ removeTwilight: 2 }],
    effects: [{ type: 'PREVENT_WOUND' }],
    source: 'SELF',
};

describe('responseWindow / coûts prevent-wound', () => {
    it('Intimidate : spot Gandalf, événement défaussé, compagnon intact', () => {
        const gandalf = createCompanion({
            id: 'gandalf',
            title: 'Gandalf',
            vitality: 4,
        });
        const gimli = createUnboundCompanion();
        const intimidate = createCard({
            id: '1C76',
            title: 'Intimidate',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            culture: 'GANDALF',
            twilightCost: 2,
            phases: ['RESPONSE'],
            abilities: [INTIMIDATE_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli, gandalf],
                        hand: [intimidate],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);

        engine.moves.playCard(0);

        const G = engine.getG();
        const wounded = G.players['0']?.fellowshipArea.find(
            (c) => c.id === 'gimli'
        );
        expect(wounded?.wounds || 0).toBe(0);
        expect(G.players['0']?.hand).toHaveLength(0);
        expect(G.players['0']?.discard.map((c) => c.id)).toContain('1C76');
        expect(G.twilightPool).toBe(2);
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
    });

    it('Intimidate sans Gandalf : blessure immédiate, pas de toaster', () => {
        const gimli = createUnboundCompanion();
        const intimidate = createCard({
            id: '1C76',
            title: 'Intimidate',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            culture: 'GANDALF',
            twilightCost: 2,
            phases: ['RESPONSE'],
            abilities: [INTIMIDATE_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli],
                        hand: [intimidate],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.responseWindow).toBeUndefined();
        expect(G.players['0']?.hand).toHaveLength(1);
    });

    it('Goblin Armory : défausse la condition, Orc Moria intact', () => {
        const orc = createMinion({
            id: 'moria-orc',
            title: 'Goblin Runner',
            culture: 'MORIA',
            race: 'ORC',
            vitality: 2,
        });
        const armory = createCard({
            id: '1R173',
            title: 'Goblin Armory',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'MORIA',
            actionPhases: ['RESPONSE'],
            abilities: [GOBLIN_ARMORY_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                battlefield: [orc],
                players: {
                    '1': createPlayerState('1', {
                        supportArea: [armory],
                    }),
                },
            },
        });

        engine.moves.applyWound('moria-orc');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);
        expect(engine.getG().responseWindow?.activePlayerId).toBe('1');

        engine.updatePlayerID('1');
        engine.moves.activateAbility('1R173', '1R173:0');

        const G = engine.getG();
        expect(G.battlefield[0]?.wounds || 0).toBe(0);
        expect(G.players['1']?.supportArea).toHaveLength(0);
        expect(G.players['1']?.discard.map((c) => c.id)).toContain('1R173');
        expect(G.responseWindow).toBeUndefined();
    });

    it('Isengard Shaman : crépuscule insuffisant → blessure immédiate', () => {
        const shaman = createMinion({
            id: '3C59',
            title: 'Isengard Shaman',
            culture: 'ISENGARD',
            race: 'ORC',
            vitality: 2,
            actionPhases: ['RESPONSE'],
            abilities: [SHAMAN_ABILITY],
        });
        const grunt = createMinion({
            id: 'isengard-orc',
            title: 'Isengard Orc',
            culture: 'ISENGARD',
            race: 'ORC',
            vitality: 2,
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 1,
                battlefield: [shaman, grunt],
            },
        });

        engine.moves.applyWound('isengard-orc');

        const G = engine.getG();
        expect(G.battlefield.find((c) => c.id === 'isengard-orc')?.wounds).toBe(
            1
        );
        expect(G.responseWindow).toBeUndefined();
        expect(G.twilightPool).toBe(1);
    });

    it('Isengard Shaman : retire 2 crépuscule, Orc intact', () => {
        const shaman = createMinion({
            id: '3C59',
            title: 'Isengard Shaman',
            culture: 'ISENGARD',
            race: 'ORC',
            vitality: 2,
            actionPhases: ['RESPONSE'],
            abilities: [SHAMAN_ABILITY],
        });
        const grunt = createMinion({
            id: 'isengard-orc',
            title: 'Isengard Orc',
            culture: 'ISENGARD',
            race: 'ORC',
            vitality: 2,
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 3,
                battlefield: [shaman, grunt],
            },
        });

        engine.moves.applyWound('isengard-orc');
        engine.updatePlayerID('1');
        engine.moves.activateAbility('3C59', '3C59:0');

        const G = engine.getG();
        expect(G.battlefield.find((c) => c.id === 'isengard-orc')?.wounds || 0).toBe(
            0
        );
        expect(G.twilightPool).toBe(1);
        expect(G.responseWindow).toBeUndefined();
    });

    it('Hides : retire 2 crépuscule, possession reste en jeu', () => {
        const dunlending = createMinion({
            id: 'dunlending',
            title: 'Dunlending Pillager',
            culture: 'DUNLAND',
            race: 'MAN',
            vitality: 2,
        });
        const hides = createCard({
            id: '4R19',
            title: 'Hides',
            kind: 'SHADOW',
            type: 'POSSESSION',
            culture: 'DUNLAND',
            actionPhases: ['RESPONSE'],
            abilities: [HIDES_TWILIGHT_ABILITY, HIDES_DISCARD_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 2,
                battlefield: [dunlending],
                players: {
                    '1': createPlayerState('1', {
                        supportArea: [hides],
                    }),
                },
            },
        });

        engine.moves.applyWound('dunlending');
        engine.updatePlayerID('1');
        engine.moves.activateAbility('4R19', '4R19:0');

        const G = engine.getG();
        expect(G.battlefield[0]?.wounds || 0).toBe(0);
        expect(G.twilightPool).toBe(0);
        expect(G.players['1']?.supportArea.map((c) => c.id)).toContain('4R19');
        expect(G.responseWindow).toBeUndefined();
    });

    it('Hides : défausse la possession si pas assez de crépuscule', () => {
        const dunlending = createMinion({
            id: 'dunlending',
            title: 'Dunlending Pillager',
            culture: 'DUNLAND',
            race: 'MAN',
            vitality: 2,
        });
        const hides = createCard({
            id: '4R19',
            title: 'Hides',
            kind: 'SHADOW',
            type: 'POSSESSION',
            culture: 'DUNLAND',
            actionPhases: ['RESPONSE'],
            abilities: [HIDES_TWILIGHT_ABILITY, HIDES_DISCARD_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 0,
                battlefield: [dunlending],
                players: {
                    '1': createPlayerState('1', {
                        supportArea: [hides],
                    }),
                },
            },
        });

        engine.moves.applyWound('dunlending');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);

        engine.updatePlayerID('1');
        engine.moves.activateAbility('4R19', '4R19:1');

        const G = engine.getG();
        expect(G.battlefield[0]?.wounds || 0).toBe(0);
        expect(G.twilightPool).toBe(0);
        expect(G.players['1']?.supportArea).toHaveLength(0);
        expect(G.players['1']?.discard.map((c) => c.id)).toContain('4R19');
        expect(G.responseWindow).toBeUndefined();
    });

    it('Dwarven Bracers : défausse l’attachement, porteur intact', () => {
        const bracersAbility: Ability = {
            id: '2U3:0',
            phases: ['RESPONSE'],
            trigger: {
                type: 'ABOUT_TO_WOUND',
                target: 'BEARER',
            },
            cost: [{ discardFromPlay: [{ count: 1, target: 'SELF' }] }],
            effects: [{ type: 'PREVENT_WOUND' }],
            source: 'SELF',
        };
        const gimli = createCompanion({
            id: 'gimli',
            title: 'Gimli',
            keywords: ['UNBOUND'],
            race: 'DWARF',
            vitality: 3,
            attachments: [
                createCard({
                    id: '2U3',
                    title: 'Dwarven Bracers',
                    kind: 'FREE_PEOPLE',
                    type: 'POSSESSION',
                    culture: 'DWARVEN',
                    actionPhases: ['RESPONSE'],
                    abilities: [bracersAbility],
                }),
            ],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');
        engine.moves.activateAbility('2U3', '2U3:0');

        const G = engine.getG();
        const bearer = G.players['0']?.fellowshipArea[0];
        expect(bearer?.wounds || 0).toBe(0);
        expect(bearer?.attachments || []).toHaveLength(0);
        expect(G.players['0']?.discard.map((c) => c.id)).toContain('2U3');
        expect(G.responseWindow).toBeUndefined();
    });

    it('Arwen : défausse 3 cartes de la main, Porteur intact', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            keywords: ['RING-BOUND', 'RING-BEARER'],
            vitality: 4,
        });
        const arwen = createCompanion({
            id: '3U7',
            title: 'Arwen',
            keywords: ['RANGER', 'UNBOUND'],
            vitality: 3,
            actionPhases: ['RESPONSE'],
            abilities: [
                {
                    id: '3U7:0',
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_WOUND',
                        target: [['RING-BEARER']],
                    },
                    cost: [{ discardFromHand: 3 }],
                    effects: [{ type: 'PREVENT_WOUND' }],
                    source: 'SELF',
                },
            ],
        });
        const hand = ['h1', 'h2', 'h3', 'h4'].map((id) =>
            createCard({ id, title: id, kind: 'FREE_PEOPLE', type: 'EVENT' })
        );

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, arwen],
                        hand,
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);

        engine.moves.activateAbility('3U7', '3U7:0', undefined, [
            'h1',
            'h2',
            'h3',
        ]);

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.players['0']?.hand.map((c) => c.id)).toEqual(['h4']);
        expect(G.players['0']?.discard.map((c) => c.id)).toEqual([
            'h1',
            'h2',
            'h3',
        ]);
        expect(G.responseWindow).toBeUndefined();
    });

    it('Arwen : main trop courte, blessure immédiate', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            keywords: ['RING-BOUND', 'RING-BEARER'],
            vitality: 4,
        });
        const arwen = createCompanion({
            id: '3U7',
            title: 'Arwen',
            vitality: 3,
            actionPhases: ['RESPONSE'],
            abilities: [
                {
                    id: '3U7:0',
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_WOUND',
                        target: [['RING-BEARER']],
                    },
                    cost: [{ discardFromHand: 3 }],
                    effects: [{ type: 'PREVENT_WOUND' }],
                    source: 'SELF',
                },
            ],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, arwen],
                        hand: [
                            createCard({
                                id: 'h1',
                                kind: 'FREE_PEOPLE',
                                type: 'EVENT',
                            }),
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

    it('King of the Dead : seulement en combat, affaiblir le séide', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            vitality: 4,
        });
        const king = createMinion({
            id: '8R38',
            title: 'King of the Dead',
            vitality: 4,
            actionPhases: ['RESPONSE'],
            abilities: [
                {
                    id: '8R38:0',
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_WOUND',
                        target: [['Aragorn']],
                        inSkirmish: true,
                    },
                    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                    effects: [{ type: 'PREVENT_WOUND' }],
                    source: 'SELF',
                },
            ],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                activeSkirmishId: 'sk-aragorn',
                skirmishes: [
                    {
                        id: 'sk-aragorn',
                        companionId: 'aragorn',
                        minionIds: ['8R38'],
                    },
                ],
                battlefield: [king],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [aragorn],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        engine.moves.applyWound('aragorn');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);
        expect(engine.getG().responseWindow?.activePlayerId).toBe('1');

        engine.updatePlayerID('1');
        engine.moves.activateAbility('8R38', '8R38:0');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.battlefield[0]?.wounds).toBe(1);
        expect(G.responseWindow).toBeUndefined();
    });

    it('King of the Dead : hors combat, pas de toaster', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            vitality: 4,
        });
        const king = createMinion({
            id: '8R38',
            title: 'King of the Dead',
            vitality: 4,
            actionPhases: ['RESPONSE'],
            abilities: [
                {
                    id: '8R38:0',
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_WOUND',
                        target: [['Aragorn']],
                        inSkirmish: true,
                    },
                    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                    effects: [{ type: 'PREVENT_WOUND' }],
                    source: 'SELF',
                },
            ],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                battlefield: [king],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [aragorn],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        engine.moves.applyWound('aragorn');
        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.responseWindow).toBeUndefined();
    });
});

const UNKNOWN_PERILS_ABILITY: Ability = {
    id: '3C36:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'ABOUT_TO_WOUND',
        target: [['COMPANION']],
    },
    cost: [
        {
            spotTwilight: 4,
            exert: [{ count: 1, target: [['Gandalf']] }],
        },
    ],
    effects: [{ type: 'PREVENT_WOUND' }],
    source: 'SELF',
};

describe('responseWindow / Périls inconnus + projection', () => {
    it('spot 4 twilight + affaiblir Gandalf empêche la blessure', () => {
        const gandalf = createCompanion({
            id: 'gandalf',
            title: 'Gandalf',
            vitality: 4,
        });
        const gimli = createUnboundCompanion();
        const perils = createCard({
            id: '3C36',
            title: 'Unknown Perils',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            actionPhases: ['RESPONSE'],
            abilities: [UNKNOWN_PERILS_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli, gandalf],
                        supportArea: [perils],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);

        engine.moves.activateAbility('3C36', '3C36:0', 'gandalf');

        const G = engine.getG();
        expect(
            G.players['0']?.fellowshipArea.find((c) => c.id === 'gimli')
                ?.wounds || 0
        ).toBe(0);
        expect(
            G.players['0']?.fellowshipArea.find((c) => c.id === 'gandalf')
                ?.wounds
        ).toBe(1);
        expect(G.twilightPool).toBe(4);
        expect(G.responseWindow).toBeUndefined();
    });

    it('crépuscule insuffisant : pas de toaster, blessure immédiate', () => {
        const gandalf = createCompanion({
            id: 'gandalf',
            title: 'Gandalf',
            vitality: 4,
        });
        const gimli = createUnboundCompanion();
        const perils = createCard({
            id: '3C36',
            title: 'Unknown Perils',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            actionPhases: ['RESPONSE'],
            abilities: [UNKNOWN_PERILS_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 3,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli, gandalf],
                        supportArea: [perils],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.responseWindow).toBeUndefined();
    });
});

describe('responseWindow / Anneau puis autre réponse', () => {
    it('après mise de l’Anneau, Intimidate reste jouable ; Passer pose les fardeaux', () => {
        const intimidate = createCard({
            id: '1C76',
            title: 'Intimidate',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            culture: 'GANDALF',
            twilightCost: 2,
            phases: ['RESPONSE'],
            abilities: [INTIMIDATE_ABILITY],
        });
        const gandalf = createCompanion({
            id: 'gandalf',
            title: 'Gandalf',
            vitality: 4,
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createFrodoWithRing(), gandalf],
                        hand: [intimidate],
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');
        engine.moves.activateAbility('1R1', '1R1:0');

        const afterRing = engine.getG();
        expect(afterRing.wearingTheOneRing).toBeDefined();
        expect(afterRing.responseWindow?.isOpen).toBe(true);
        expect(afterRing.players['0']?.burdens || 0).toBe(0);
        expect(afterRing.responseWindow?.message).toMatch(/Anneau Unique/i);

        engine.moves.passResponseWindow();

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds || 0).toBe(0);
        expect(G.players['0']?.burdens).toBe(2);
        expect(G.responseWindow).toBeUndefined();
    });
});

describe('responseWindow / halo Périls inconnus', () => {
    it('Gandalf (sans titre racine, culture GANDALF) peut jouer la réponse projetée', () => {
        const gandalf = createCompanion({
            id: '1R72',
            culture: 'GANDALF',
            race: 'WIZARD',
            vitality: 4,
            i18n: { en: { title: 'Gandalf' }, fr: { title: 'Gandalf' } },
        });
        delete (gandalf as { title?: string }).title;
        const gimli = createUnboundCompanion();
        const perils = createCard({
            id: '3C36',
            title: 'Unknown Perils',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            culture: 'GANDALF',
            subtype: 'SUPPORT-AREA',
            actionPhases: ['RESPONSE'],
            abilities: [UNKNOWN_PERILS_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli, gandalf],
                        supportArea: [perils],
                    }),
                },
            },
        });

        engine.moves.applyWound('gimli');
        const G = engine.getG();
        const host = G.players['0']?.fellowshipArea.find((c) => c.id === '1R72');
        expect(host).toBeDefined();
        expect(
            collectVisibleAbilities(G, host!).some(
                ({ ability }) => ability.id === '3C36:0'
            )
        ).toBe(true);
        expect(
            canUseAbility(host!, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '0',
            }).valid
        ).toBe(true);
    });
});

const RAMPAGE_ABILITY: Ability = {
    id: '1U159:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'WINS_SKIRMISH',
        winner: [['URUK-HAI']],
        yours: true,
    },
    cost: [{ removeTwilight: 3 }],
    effects: [
        {
            type: 'ADD_TEMP_KEYWORD',
            keyword: 'FIERCE',
            target: 'WINNER',
            expiresAtPhase: 'REGROUP',
        },
    ],
    source: 'SELF',
    text: 'RESPONSE: If your Uruk-hai wins a skirmish, remove twilight3 to make him fierce until the regroup phase.',
};

const ENHEARTENED_ABILITY: Ability = {
    id: '1R247:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'WINS_SKIRMISH',
        winner: [['SAURON', 'ORC']],
    },
    cost: [],
    effects: [
        {
            type: 'ADD_TEMP_KEYWORD',
            keyword: 'FIERCE',
            target: 'WINNER',
            expiresAtPhase: 'REGROUP',
        },
    ],
    source: 'SELF',
    text: 'RESPONSE: If a sauron Orc wins a skirmish, make that Orc fierce until the regroup phase.',
};

describe('responseWindow / WINS_SKIRMISH', () => {
    it('après victoire d’un Uruk : toaster, Frénésie rend acharné jusqu’au ralliement', () => {
        const companion = createCompanion({
            id: 'merry',
            title: 'Merry',
            strength: 4,
            vitality: 4,
        });
        const uruk = createMinion({
            id: 'uruk',
            title: 'Uruk Soldier',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            strength: 7,
            vitality: 2,
        });
        const rampage = createCard({
            id: '1U159',
            title: 'Uruk-hai Rampage',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'ISENGARD',
            actionPhases: ['RESPONSE'],
            abilities: [RAMPAGE_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 3,
                activeSkirmishId: 'sk-merry',
                skirmishes: [
                    {
                        id: 'sk-merry',
                        companionId: 'merry',
                        minionIds: ['uruk'],
                    },
                ],
                battlefield: [uruk],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [rampage],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();

        const afterResolve = engine.getG();
        expect(afterResolve.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(afterResolve.responseWindow?.isOpen).toBe(true);
        expect(afterResolve.pendingEvent).toEqual({
            type: 'WINS_SKIRMISH',
            winnerIds: ['uruk'],
            skirmishId: 'sk-merry',
        });
        expect(afterResolve.responseWindow?.activePlayerId).toBe('1');

        engine.updatePlayerID('1');
        engine.moves.activateAbility('1U159', '1U159:0');

        const afterAbility = engine.getG();
        expect(afterAbility.twilightPool).toBe(0);
        expect(afterAbility.battlefield[0]?.tempKeywords).toEqual([
            { keyword: 'FIERCE', expiresAtPhase: 'REGROUP' },
        ]);
        expect(afterAbility.responseWindow).toBeUndefined();
        expect(afterAbility.pendingEvent).toBeUndefined();
    });

    it('sans crépuscule : pas de toaster Frénésie, victoire quand même', () => {
        const companion = createCompanion({
            id: 'merry',
            strength: 4,
            vitality: 4,
        });
        const uruk = createMinion({
            id: 'uruk',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            strength: 7,
            vitality: 2,
        });
        const rampage = createCard({
            id: '1U159',
            kind: 'SHADOW',
            type: 'CONDITION',
            actionPhases: ['RESPONSE'],
            abilities: [RAMPAGE_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 2,
                activeSkirmishId: 'sk-merry',
                skirmishes: [
                    {
                        id: 'sk-merry',
                        companionId: 'merry',
                        minionIds: ['uruk'],
                    },
                ],
                battlefield: [uruk],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [rampage],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();

        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
        expect(G.battlefield[0]?.tempKeywords).toBeUndefined();
    });

    it('événement Ennemi sans Pitié depuis la main après victoire d’un Orque Sauron', () => {
        const companion = createCompanion({
            id: 'merry',
            strength: 4,
            vitality: 4,
        });
        const orc = createMinion({
            id: 'orc',
            title: 'Orc Soldier',
            culture: 'SAURON',
            race: 'ORC',
            strength: 7,
            vitality: 2,
        });
        const event = createCard({
            id: '1R247',
            title: 'Enheartened Foe',
            kind: 'SHADOW',
            type: 'EVENT',
            culture: 'SAURON',
            twilightCost: 0,
            phases: ['RESPONSE'],
            abilities: [ENHEARTENED_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 0,
                activeSkirmishId: 'sk-merry',
                skirmishes: [
                    {
                        id: 'sk-merry',
                        companionId: 'merry',
                        minionIds: ['orc'],
                    },
                ],
                battlefield: [orc],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                    '1': createPlayerState('1', {
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        expect(engine.getG().responseWindow?.isOpen).toBe(true);
        expect(engine.getG().responseWindow?.activePlayerId).toBe('1');

        engine.updatePlayerID('1');
        engine.moves.playCard(0);

        const G = engine.getG();
        expect(G.players['1']?.hand).toHaveLength(0);
        expect(G.players['1']?.discard.map((c) => c.id)).toContain('1R247');
        expect(G.battlefield[0]?.tempKeywords).toEqual([
            { keyword: 'FIERCE', expiresAtPhase: 'REGROUP' },
        ]);
        expect(G.responseWindow).toBeUndefined();
    });

    it('blessure d’abord, victoire ensuite : Éowyn puis Frénésie', () => {
        const merry = createUnboundCompanion();
        merry.id = 'merry';
        merry.instanceId = 'merry';
        merry.strength = 4;
        merry.vitality = 4;
        const eowyn = createEowyn();
        const uruk = createMinion({
            id: 'uruk',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            strength: 7,
            vitality: 2,
        });
        const rampage = createCard({
            id: '1U159',
            kind: 'SHADOW',
            type: 'CONDITION',
            actionPhases: ['RESPONSE'],
            abilities: [RAMPAGE_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 3,
                activeSkirmishId: 'sk-merry',
                skirmishes: [
                    {
                        id: 'sk-merry',
                        companionId: 'merry',
                        minionIds: ['uruk'],
                    },
                ],
                battlefield: [uruk],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [merry, eowyn],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [rampage],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        expect(engine.getG().pendingEvent?.type).toBe('ABOUT_TO_WOUND');
        expect(engine.getG().responseWindow?.activePlayerId).toBe('0');

        engine.moves.passResponseWindow();

        const afterWound = engine.getG();
        expect(afterWound.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(afterWound.pendingEvent).toEqual({
            type: 'WINS_SKIRMISH',
            winnerIds: ['uruk'],
            skirmishId: 'sk-merry',
        });
        expect(afterWound.responseWindow?.isOpen).toBe(true);
        expect(afterWound.responseWindow?.activePlayerId).toBe('1');
    });
});
