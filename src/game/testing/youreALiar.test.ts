import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';
import { getCardById } from '../cardsData';
import { cardMatchesCriterion } from '../engine/validations/matchers';
import type { Ability, CardState } from '../types';

const LIAR_ABILITY: Ability = {
    id: '6C47:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'WINS_SKIRMISH',
        winner: [['Gollum']],
    },
    cost: [],
    effects: [
        {
            type: 'WOUND',
            count: 1,
            target: [['COMPANION']],
            excludeRingBearer: true,
        },
    ],
    source: 'SELF',
    text: 'RESPONSE: If Gollum wins a skirmish, wound a companion (except the Ring-bearer)',
};

const PROMISE_ABILITY: Ability = {
    id: '8R24:0',
    phases: ['RESPONSE'],
    trigger: {
        type: 'TAKES_WOUND',
        target: [['COMPANION']],
        inSkirmish: true,
        involving: [['GOLLUM', 'MINION']],
    },
    cost: [],
    effects: [
        {
            type: 'EXERT',
            count: 1,
            target: [['COMPANION']],
        },
    ],
    source: 'SELF',
    text: 'Each time a companion takes a wound during a skirmish that involved a gollum minion, exert a companion.',
};

/** Force 5 vs 3 : victoire Ombre sans submersion (sinon pas de TAKES_WOUND). */
function setupGollumWin(opts: {
    withPromise?: boolean;
    withLiar?: boolean;
}) {
    const frodo = createCompanion({
        id: 'frodo',
        title: 'Frodo',
        strength: 3,
        vitality: 4,
        ringBearer: true,
    });
    const smeagol = createCompanion({
        id: 'smeagol',
        title: 'Sméagol',
        culture: 'GOLLUM',
        strength: 3,
        vitality: 4,
    });
    const gollum = createMinion({
        id: 'gollum',
        title: 'Gollum',
        culture: 'GOLLUM',
        strength: 5,
        vitality: 4,
    });
    const liar = createCard({
        id: '6C47',
        title: "You're a Liar and a Thief",
        kind: 'SHADOW',
        type: 'EVENT',
        culture: 'GOLLUM',
        twilightCost: 0,
        phases: ['RESPONSE'],
        abilities: [LIAR_ABILITY],
    });
    const promise = createCard({
        id: '8R24',
        title: 'Promise Keeping',
        kind: 'SHADOW',
        type: 'CONDITION',
        culture: 'GOLLUM',
        twilightCost: 0,
        actionPhases: ['RESPONSE'],
        abilities: [PROMISE_ABILITY],
    });

    return createEngineClient({
        startPhase: 'skirmish',
        playerID: '0',
        G: {
            twilightPool: 5,
            activeSkirmishId: 'sk-1',
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'smeagol',
                    minionIds: ['gollum'],
                },
            ],
            battlefield: [gollum],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, smeagol],
                }),
                '1': createPlayerState('1', {
                    hand: opts.withLiar === false ? [] : [liar],
                    supportArea: opts.withPromise ? [promise] : [],
                }),
            },
        },
    });
}

describe("You're a Liar after Promise Keeping", () => {
    it('après blessure + Promise Keeping passé : toaster WINS pour Tu es un menteur', () => {
        const engine = setupGollumWin({ withPromise: true });
        engine.moves.resolveActiveSkirmish();

        const afterResolve = engine.getG();
        expect(afterResolve.pendingEvent?.type).toBe('TAKES_WOUND');
        expect(afterResolve.responseWindow?.isOpen).toBe(true);
        expect(afterResolve.pendingWinsSkirmish?.winnerIds).toContain('gollum');
        expect(afterResolve.responseWindow?.activePlayerId).toBe('1');

        engine.updatePlayerID('1');
        engine.moves.passResponseWindow();

        const afterPass = engine.getG();
        expect(afterPass.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(afterPass.responseWindow?.isOpen).toBe(true);
        expect(afterPass.responseWindow?.activePlayerId).toBe('1');
        expect(afterPass.pendingEvent).toEqual({
            type: 'WINS_SKIRMISH',
            winnerIds: ['gollum'],
            skirmishId: 'sk-1',
        });
    });

    it('Promise Keeping joué (exert) puis toaster WINS pour Tu es un menteur', () => {
        const engine = setupGollumWin({ withPromise: true });
        engine.moves.resolveActiveSkirmish();
        expect(engine.getG().pendingEvent?.type).toBe('TAKES_WOUND');

        engine.updatePlayerID('1');
        engine.moves.activateAbility('8R24', '8R24:0', 'smeagol');

        const afterPromise = engine.getG();
        expect(afterPromise.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(afterPromise.responseWindow?.isOpen).toBe(true);
        expect(afterPromise.responseWindow?.activePlayerId).toBe('1');
    });

    it('sans Promise Keeping : toaster WINS directement pour Tu es un menteur', () => {
        const engine = setupGollumWin({});
        engine.moves.resolveActiveSkirmish();

        const G = engine.getG();
        expect(G.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('1');
    });

    it('jouer Tu es un menteur : blessure appliquée tout de suite (pas en file jusqu’à la 2ᵉ)', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
            vitality: 4,
            ringBearer: true,
        });
        const smeagol = createCompanion({
            id: 'smeagol',
            title: 'Sméagol',
            culture: 'GOLLUM',
            strength: 3,
            vitality: 4,
            wounds: 0,
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            strength: 8,
            vitality: 4,
            wounds: 0,
        });
        const gollum = createMinion({
            id: 'gollum',
            title: 'Gollum',
            culture: 'GOLLUM',
            strength: 5,
            vitality: 4,
        });
        const liar1 = createCard({
            id: '6C47',
            instanceId: 'liar-1',
            title: "You're a Liar and a Thief",
            kind: 'SHADOW',
            type: 'EVENT',
            culture: 'GOLLUM',
            twilightCost: 0,
            phases: ['RESPONSE'],
            abilities: [LIAR_ABILITY],
        });
        const liar2 = createCard({
            id: '6C47',
            instanceId: 'liar-2',
            title: "You're a Liar and a Thief",
            kind: 'SHADOW',
            type: 'EVENT',
            culture: 'GOLLUM',
            twilightCost: 0,
            phases: ['RESPONSE'],
            abilities: [LIAR_ABILITY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 5,
                activeSkirmishId: 'sk-1',
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'smeagol',
                        minionIds: ['gollum'],
                    },
                ],
                battlefield: [gollum],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, smeagol, aragorn],
                    }),
                    '1': createPlayerState('1', {
                        hand: [liar1, liar2],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        expect(engine.getG().pendingEvent?.type).toBe('WINS_SKIRMISH');

        engine.updatePlayerID('1');
        engine.moves.playCard(0, 'aragorn');

        const afterFirst = engine.getG();
        const aragornAfter = afterFirst.players['0']?.fellowshipArea.find(
            (c) => c.id === 'aragorn'
        );
        expect(aragornAfter?.wounds).toBe(1);
        expect(afterFirst.woundQueue?.length || 0).toBe(0);
        // Fenêtre WINS encore ouverte pour le 2ᵉ exemplaire.
        expect(afterFirst.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(afterFirst.responseWindow?.isOpen).toBe(true);

        // 2ᵉ Liar → encore Aragorn (Sméagol a déjà 1 blessure de l’escarmouche).
        engine.moves.playCard(0, 'aragorn');
        const afterSecond = engine.getG();
        expect(
            afterSecond.players['0']?.fellowshipArea.find(
                (c) => c.id === 'aragorn'
            )?.wounds
        ).toBe(2);
    });

    it('cartes JSON réelles 7C59 + 8R24 + 6C47 : chaîne blessure → WINS', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
            vitality: 4,
            ringBearer: true,
        });
        const smeagol = createCompanion({
            id: 'smeagol',
            title: 'Sméagol',
            culture: 'GOLLUM',
            strength: 3,
            vitality: 4,
        });
        const gollumTpl = getCardById('7C59') as CardState;
        const liarTpl = getCardById('6C47') as CardState;
        const promiseTpl = getCardById('8R24') as CardState;
        expect(cardMatchesCriterion(gollumTpl, 'Gollum')).toBe(true);

        const gollum: CardState = {
            ...gollumTpl,
            instanceId: 'gollum-inst',
            strength: 5,
            vitality: 4,
            wounds: 0,
        };
        const liar: CardState = { ...liarTpl, instanceId: 'liar-1' };
        const promise: CardState = { ...promiseTpl, instanceId: 'promise-1' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 5,
                activeSkirmishId: 'sk-1',
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'smeagol',
                        minionIds: ['gollum-inst'],
                    },
                ],
                battlefield: [gollum],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, smeagol],
                    }),
                    '1': createPlayerState('1', {
                        hand: [liar],
                        supportArea: [promise],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        expect(engine.getG().pendingEvent?.type).toBe('TAKES_WOUND');

        engine.updatePlayerID('1');
        engine.moves.passResponseWindow();

        const after = engine.getG();
        expect(after.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(after.responseWindow?.isOpen).toBe(true);
        expect(after.responseWindow?.activePlayerId).toBe('1');
    });

    it('Shelob gagne : Promise Keeping oui, Tu es un menteur non', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
            vitality: 4,
            ringBearer: true,
        });
        const smeagol = createCompanion({
            id: 'smeagol',
            title: 'Sméagol',
            culture: 'GOLLUM',
            strength: 3,
            vitality: 4,
        });
        const shelobTpl = getCardById('8R25') as CardState;
        const liarTpl = getCardById('6C47') as CardState;
        const promiseTpl = getCardById('8R24') as CardState;
        expect(cardMatchesCriterion(shelobTpl, 'Gollum')).toBe(false);

        const shelob: CardState = {
            ...shelobTpl,
            instanceId: 'shelob-inst',
            strength: 5,
            vitality: 4,
            wounds: 0,
        };
        const liar: CardState = { ...liarTpl, instanceId: 'liar-1' };
        const promise: CardState = { ...promiseTpl, instanceId: 'promise-1' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 5,
                activeSkirmishId: 'sk-1',
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'smeagol',
                        minionIds: ['shelob-inst'],
                    },
                ],
                battlefield: [shelob],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, smeagol],
                    }),
                    '1': createPlayerState('1', {
                        hand: [liar],
                        supportArea: [promise],
                    }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        expect(engine.getG().pendingEvent?.type).toBe('TAKES_WOUND');

        engine.updatePlayerID('1');
        engine.moves.passResponseWindow();

        const after = engine.getG();
        // Pas de réponse WINS éligible (Shelob ≠ Gollum) → fenêtre fermée.
        expect(after.pendingEvent?.type).not.toBe('WINS_SKIRMISH');
        expect(after.responseWindow?.isOpen).toBeFalsy();
    });
});

describe("You're a Liar with Mad Thing (10R21)", () => {
    it('Mad Thing gagne sans submersion : toaster WINS', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
            vitality: 4,
            ringBearer: true,
        });
        const smeagol = createCompanion({
            id: 'smeagol',
            title: 'Sméagol',
            culture: 'GOLLUM',
            strength: 3,
            vitality: 4,
        });
        const madTpl = getCardById('10R21') as CardState;
        const liarTpl = getCardById('6C47') as CardState;
        expect(cardMatchesCriterion(madTpl, 'Gollum')).toBe(true);

        const mad: CardState = {
            ...madTpl,
            instanceId: 'mad-inst',
            strength: 5,
            vitality: 4,
            wounds: 0,
        };
        const liar: CardState = { ...liarTpl, instanceId: 'liar-1' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 5,
                activeSkirmishId: 'sk-1',
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'smeagol',
                        minionIds: ['mad-inst'],
                    },
                ],
                battlefield: [mad],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, smeagol],
                    }),
                    '1': createPlayerState('1', { hand: [liar] }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        const G = engine.getG();
        expect(G.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('1');
    });

    it('Mad Thing +3 vs Aragorn (8=8) : égalité = Ombre gagne → toaster WINS', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
            vitality: 4,
            ringBearer: true,
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            strength: 8,
            vitality: 4,
        });
        const madTpl = getCardById('10R21') as CardState;
        const liarTpl = getCardById('6C47') as CardState;

        const mad: CardState = {
            ...madTpl,
            instanceId: 'mad-inst',
            strength: 5,
            vitality: 4,
            wounds: 0,
        };
        const liar: CardState = { ...liarTpl, instanceId: 'liar-1' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 5,
                activeSkirmishId: 'sk-1',
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'aragorn',
                        minionIds: ['mad-inst'],
                    },
                ],
                battlefield: [mad],
                tempModifiers: [
                    {
                        id: 'mad-plus3',
                        targetCardId: 'mad-inst',
                        stat: 'STRENGTH',
                        value: 3,
                        scope: 'REGROUP',
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, aragorn],
                    }),
                    '1': createPlayerState('1', { hand: [liar] }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        // D’abord TAKES_WOUND (pas de Promise ici) → WINS directement si pas de réponse.
        // Sans Promise : WINS tout de suite.
        const G = engine.getG();
        expect(G.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(G.pendingEvent).toMatchObject({
            type: 'WINS_SKIRMISH',
            winnerIds: ['mad-inst'],
        });
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('1');
        expect(
            G.players['0']?.fellowshipArea.find((c) => c.id === 'aragorn')
                ?.wounds
        ).toBe(1);
    });

    it('Mad Thing +3 (affectation) submerge Frodo : toaster WINS quand même', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
            vitality: 4,
            ringBearer: true,
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            strength: 8,
            vitality: 4,
        });
        const madTpl = getCardById('10R21') as CardState;
        const liarTpl = getCardById('6C47') as CardState;

        const mad: CardState = {
            ...madTpl,
            instanceId: 'mad-inst',
            strength: 5,
            vitality: 4,
            wounds: 0,
        };
        const liar: CardState = { ...liarTpl, instanceId: 'liar-1' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                twilightPool: 5,
                activeSkirmishId: 'sk-1',
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'frodo',
                        minionIds: ['mad-inst'],
                    },
                ],
                battlefield: [mad],
                tempModifiers: [
                    {
                        id: 'mad-plus3',
                        targetCardId: 'mad-inst',
                        stat: 'STRENGTH',
                        value: 3,
                        scope: 'REGROUP',
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, aragorn],
                    }),
                    '1': createPlayerState('1', { hand: [liar] }),
                },
            },
        });

        engine.moves.resolveActiveSkirmish();
        const G = engine.getG();
        // Frodo submergé (8 >= 6) — pas de TAKES_WOUND, mais WINS pour Liar.
        expect(G.pendingEvent?.type).toBe('WINS_SKIRMISH');
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('1');
        expect(G.players['0']?.fellowshipArea.find((c) => c.id === 'frodo')?.isDead).toBe(
            true
        );
    });
});
