import { describe, expect, it } from 'vitest';
import { canUseAbility } from './canUseAbility';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
} from '../testing/createGameState';

describe('canUseAbility', () => {
    it('refuse qu’un joueur active une carte de l’autre camp', () => {
        const fpCard = createCompanion({
            id: 'comp',
            actionPhases: ['fellowship'],
        });
        const shadowCard = createMinion({
            id: 'orc',
            actionPhases: ['shadow'],
        });
        const G = createGameState();

        expect(
            canUseAbility(fpCard, {
                G,
                ctx: { phase: 'fellowship' },
                playerID: '1',
            }).valid
        ).toBe(false);

        expect(
            canUseAbility(shadowCard, {
                G,
                ctx: { phase: 'shadow' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });

    it('autorise MUSTER au regroupement, y compris via grantsKeywords', () => {
        const G = createGameState();
        const muster = createCompanion({
            id: 'frodo',
            keywords: ['MUSTER'],
        });
        const viaAttachment = createCompanion({
            id: 'comp',
            attachments: [
                createCard({
                    id: 'pipe',
                    type: 'POSSESSION',
                    grantsKeywords: ['MUSTER'],
                }),
            ],
        });

        expect(
            canUseAbility(muster, {
                G,
                ctx: { phase: 'startOfRegroup' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(
            canUseAbility(viaAttachment, {
                G,
                ctx: { phase: 'regroup' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(
            canUseAbility(muster, {
                G,
                ctx: { phase: 'fellowship' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });

    it('autorise une capacité dont actionPhases matche la phase courante', () => {
        const card = createCompanion({
            id: 'comp',
            actionPhases: ['startOfFellowship'],
        });
        const G = createGameState();

        expect(
            canUseAbility(card, {
                G,
                ctx: { phase: 'startOfFellowship' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(
            canUseAbility(card, {
                G,
                ctx: { phase: 'fellowship' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });

    it('n’autorise une action Skirmish que pendant une escarmouche sélectionnée', () => {
        const card = createCompanion({
            id: 'gimli',
            actionPhases: ['SKIRMISH'],
        });
        const closed = createGameState();
        const open = createGameState({
            activeSkirmishId: 'sk-1',
            actionWindow: {
                isOpen: true,
                activePlayerId: '0',
                canPass: true,
                passesCount: 0,
            },
        });

        expect(
            canUseAbility(card, {
                G: closed,
                ctx: { phase: 'skirmish' },
                playerID: '0',
            }).valid
        ).toBe(false);
        expect(
            canUseAbility(card, {
                G: open,
                ctx: { phase: 'skirmish' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(
            canUseAbility(card, {
                G: {
                    ...open,
                    actionWindow: {
                        ...open.actionWindow!,
                        activePlayerId: '1',
                    },
                },
                ctx: { phase: 'skirmish' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });

    it('refuse les capacités d’archerie pendant l’attribution des flèches', () => {
        const card = createCompanion({
            id: 'legolas',
            actionPhases: ['ARCHERY'],
        });
        const duringActions = createGameState({
            archeryState: {
                step: 'ACTIONS',
                fpTotal: 1,
                shadowTotal: 1,
                fpRemainingWounds: 1,
                shadowRemainingWounds: 1,
            },
            actionWindow: {
                isOpen: true,
                activePlayerId: '0',
                canPass: true,
                passesCount: 0,
            },
        });
        const duringFpAssign = createGameState({
            archeryState: {
                step: 'FP_ASSIGN',
                fpTotal: 1,
                shadowTotal: 1,
                fpRemainingWounds: 1,
                shadowRemainingWounds: 1,
            },
        });
        const duringShadowAssign = createGameState({
            archeryState: {
                step: 'SHADOW_ASSIGN',
                fpTotal: 1,
                shadowTotal: 1,
                fpRemainingWounds: 0,
                shadowRemainingWounds: 1,
            },
        });

        expect(
            canUseAbility(card, {
                G: duringActions,
                ctx: { phase: 'archery' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(
            canUseAbility(card, {
                G: duringFpAssign,
                ctx: { phase: 'archery' },
                playerID: '0',
            }).valid
        ).toBe(false);
        expect(
            canUseAbility(card, {
                G: duringShadowAssign,
                ctx: { phase: 'archery' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });

    it('n’autorise une action d’affectation que pendant la fenêtre d’actions', () => {
        const card = createCompanion({
            id: '0P21',
            actionPhases: ['ASSIGNMENT', 'SKIRMISH'],
            abilities: [
                {
                    id: '0P21:0',
                    phases: ['ASSIGNMENT'],
                    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                    effects: [{ type: 'ALLOW_SKIRMISH', target: 'SELF' }],
                    source: 'SELF',
                },
            ],
        });
        const duringActions = createGameState({
            assignmentStep: 'ACTIONS',
            actionWindow: {
                isOpen: true,
                activePlayerId: '0',
                canPass: true,
                passesCount: 0,
            },
        });
        const duringFpAssign = createGameState({
            assignmentStep: 'FP_ASSIGN',
        });

        expect(
            canUseAbility(card, {
                G: duringActions,
                ctx: { phase: 'assignment' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(
            canUseAbility(card, {
                G: duringFpAssign,
                ctx: { phase: 'assignment' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });

    it('n’allume pas une carte dont actionPhases matche mais sans capacité de cette phase', () => {
        const card = createCompanion({
            id: '0P21',
            actionPhases: ['ASSIGNMENT', 'SKIRMISH'],
            abilities: [
                {
                    id: '0P21:1',
                    phases: ['SKIRMISH'],
                    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                    effects: [
                        {
                            type: 'ADD_TEMP_KEYWORD',
                            keyword: 'DAMAGE +1',
                            target: 'SELF',
                            expiresAtPhase: 'SKIRMISH',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const G = createGameState({
            assignmentStep: 'ACTIONS',
            actionWindow: {
                isOpen: true,
                activePlayerId: '0',
                canPass: true,
                passesCount: 0,
            },
        });

        expect(
            canUseAbility(card, {
                G,
                ctx: { phase: 'assignment' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });
});
