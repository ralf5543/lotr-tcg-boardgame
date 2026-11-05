import { describe, expect, it } from 'vitest';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    formatDesignationPrompt,
    getCostDesignationCandidates,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { createEngineClient } from './createEngineClient';

const SARUMAN_ABILITY: Ability = {
    id: '0P11:0',
    phases: ['ASSIGNMENT'],
    cost: [
        {
            exert: [{ count: 1, target: 'SELF' }],
            spot: [
                {
                    count: 1,
                    target: [['ISENGARD', 'MINION']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [
        {
            type: 'FORCE_ASSIGN',
            minion: 'COST_TARGET',
            companion: [['COMPANION']],
            excludeRingBearer: true,
            fpMayPrevent: { exert: true },
        },
    ],
    source: 'SELF',
};

describe('Saruman Servant of the Eye — FORCE_ASSIGN', () => {
    function setup() {
        const saruman = createMinion({
            id: '0P11',
            instanceId: 'saruman-1',
            title: 'Saruman',
            culture: 'ISENGARD',
            race: 'WIZARD',
            vitality: 4,
            cannotBeAssignedToSkirmish: true,
            abilities: [SARUMAN_ABILITY],
            actionPhases: ['ASSIGNMENT'],
        });
        const uruk = createMinion({
            id: 'uruk',
            instanceId: 'uruk-1',
            title: 'Uruk',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            vitality: 3,
            strength: 8,
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            title: 'Aragorn',
            vitality: 4,
            strength: 8,
        });
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo-1',
            title: 'Frodo',
            keywords: ['RING-BEARER'],
            vitality: 4,
        });
        const G = createGameState({
            fpPlayerId: '0',
            assignmentStep: 'ACTIONS',
            battlefield: [saruman, uruk],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, aragorn],
                }),
                '1': createPlayerState('1'),
            },
        });
        return { G, saruman, uruk, aragorn, frodo };
    }

    it('désigne d’abord un séide Isengard, puis un compagnon (pas Porteur)', () => {
        const { G, saruman } = setup();
        expect(
            abilityNeedsCostDesignation(G, saruman, SARUMAN_ABILITY, '1')
        ).toBe(true);
        expect(
            getCostDesignationCandidates(G, saruman, SARUMAN_ABILITY, '1').map(
                (c) => c.instanceId
            )
        ).toEqual(['uruk-1']);
        expect(formatDesignationPrompt(SARUMAN_ABILITY, 'cost')).toMatch(
            /séide|Isengard|isengard/i
        );
        expect(abilityNeedsEffectDesignation(G, saruman, SARUMAN_ABILITY)).toBe(
            true
        );
        const companions = getEffectDesignationCandidates(
            G,
            saruman,
            SARUMAN_ABILITY
        ).map((c) => c.instanceId);
        expect(companions).toContain('aragorn-1');
        expect(companions).not.toContain('frodo-1');
        expect(formatDesignationPrompt(SARUMAN_ABILITY, 'effect')).toMatch(
            /compagnon/i
        );
    });

    it('applyAbilityEffect : uruk → Aragorn ouvre ABOUT_TO_FORCE_ASSIGN', () => {
        const { G, saruman } = setup();
        expect(
            applyAbilityEffect(
                G,
                saruman,
                SARUMAN_ABILITY,
                'aragorn-1',
                undefined,
                'uruk-1',
                '1'
            )
        ).toBe(true);
        expect(G.pendingEvent?.type).toBe('ABOUT_TO_FORCE_ASSIGN');
        expect(G.pendingEvent).toMatchObject({
            minionId: 'uruk-1',
            companionId: 'aragorn-1',
        });
    });

    it('activateAbility via moteur : séide puis compagnon', () => {
        const { saruman, uruk, aragorn } = setup();
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                fpPlayerId: '0',
                battlefield: [saruman, uruk],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                instanceId: 'frodo-1',
                                keywords: ['RING-BEARER'],
                            }),
                            aragorn,
                        ],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        // Fenêtre d’actions d’affectation : FP passe, puis Ombre agit.
        expect(engine.getG().assignmentStep).toBe('ACTIONS');
        engine.moves.passActionWindow();
        engine.updatePlayerID('1');
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');

        engine.moves.activateAbility(
            'saruman-1',
            '0P11:0',
            'uruk-1',
            undefined,
            'aragorn-1'
        );
        const g = engine.getG();
        const sar = g.battlefield.find((c) => c.instanceId === 'saruman-1');
        expect(sar?.wounds).toBe(1);
        expect(g.pendingEvent?.type).toBe('ABOUT_TO_FORCE_ASSIGN');
        expect(g.pendingEvent).toMatchObject({
            minionId: 'uruk-1',
            companionId: 'aragorn-1',
        });
    });
});
