import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    getCostDesignationCandidates,
    getEffectDesignationCount,
} from '../engine/abilities/designation';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { applyEventAbility } from '../engine/abilities/playEventAbility';
import { createEngineClient } from './createEngineClient';
import {
    createGameState,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';

describe('Courroux Sanguinaire (7U157)', () => {
    const event = getCardById('7U157')!;
    const ability = event.abilities![0]!;

    it('parse : affaiblir Homme pillard → blesser ×2 le compagnon qu’il combat', () => {
        expect(ability.phases).toEqual(['SKIRMISH']);
        expect(ability.cost).toEqual([
            {
                exert: [
                    {
                        count: 1,
                        target: [['RAIDER', 'MAN']],
                        mode: 'DESIGNATION',
                    },
                ],
            },
        ]);
        expect(ability.effects).toEqual([
            {
                type: 'WOUND',
                count: 2,
                target: [['CHARACTER']],
                involving: 'COST_TARGET',
                match: [['COMPANION']],
            },
        ]);
    });

    it('demande seulement le coût ; applique 2 blessures au compagnon', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            wounds: 0,
        };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'raider',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const pending = { ...event, instanceId: 'wrath' };
        const G = createGameState({
            twilightPool: 5,
            battlefield: [raider],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['raider'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                }),
                '1': createPlayerState('1', {
                    hand: [pending],
                }),
            },
        });

        expect(
            canPlayCard(pending, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '1',
            }).valid
        ).toBe(true);
        expect(abilityNeedsCostDesignation(G, pending, ability)).toBe(true);
        expect(abilityNeedsEffectDesignation(G, pending, ability)).toBe(false);
        expect(getEffectDesignationCount(G, pending, ability)).toBe(0);
        expect(
            getCostDesignationCandidates(G, pending, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['raider']);

        expect(applyEventAbility(G, pending, 'skirmish', 'raider')).toBe(true);
        expect(raider.wounds).toBe(1);
        expect(ranger.wounds).toBe(2);
    });

    it('accepte l’id de coût en 4ᵉ argument (pas seulement costTargetId)', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            wounds: 0,
        };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'raider',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const pending = { ...event, instanceId: 'wrath' };
        const G = createGameState({
            twilightPool: 5,
            battlefield: [raider],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['raider'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                }),
                '1': createPlayerState('1', {
                    hand: [pending],
                }),
            },
        });

        // Ancien chemin UI : playCard(index, costId) → chosenTargetId seulement.
        expect(applyAbilityEffect(G, pending, ability, 'raider')).toBe(true);
        expect(ranger.wounds).toBe(2);
    });
});

describe('Courroux Sanguinaire — playCard Ombre', () => {
    it('joue via playCard et blesse ×2 le rôdeur', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'dev-rw-frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'dev-rw-ranger',
            wounds: 0,
        };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'dev-rw-raider',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const pending = { ...getCardById('7U157')!, instanceId: 'dev-rw-event' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '1',
            G: {
                ...createSkirmishActionWindow('dev-rw-sk', '1'),
                twilightPool: 5,
                fpPlayerId: '0',
                battlefield: [raider],
                skirmishes: [
                    {
                        id: 'dev-rw-sk',
                        companionId: 'dev-rw-ranger',
                        minionIds: ['dev-rw-raider'],
                    },
                ],
                activeSkirmishId: 'dev-rw-sk',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, ranger],
                    }),
                    '1': createPlayerState('1', {
                        hand: [pending],
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'dev-rw-raider');
        const G = engine.getG();
        expect(G.players['1']?.hand).toHaveLength(0);
        expect(G.players['1']?.discard?.[0]?.id).toBe('7U157');
        expect(G.battlefield[0]?.wounds).toBe(1);
        expect(
            G.players['0']?.fellowshipArea.find(
                (c) => c.instanceId === 'dev-rw-ranger'
            )?.wounds
        ).toBe(2);
    });

    it('sans cible de coût : événement revient en main', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'dev-rw-frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'dev-rw-ranger',
            wounds: 0,
        };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'dev-rw-raider',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const pending = { ...getCardById('7U157')!, instanceId: 'dev-rw-event' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '1',
            G: {
                ...createSkirmishActionWindow('dev-rw-sk', '1'),
                twilightPool: 5,
                fpPlayerId: '0',
                battlefield: [raider],
                skirmishes: [
                    {
                        id: 'dev-rw-sk',
                        companionId: 'dev-rw-ranger',
                        minionIds: ['dev-rw-raider'],
                    },
                ],
                activeSkirmishId: 'dev-rw-sk',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, ranger],
                    }),
                    '1': createPlayerState('1', {
                        hand: [pending],
                    }),
                },
            },
        });

        engine.moves.playCard(0);
        const G = engine.getG();
        expect(G.players['1']?.hand.map((c) => c.id)).toEqual(['7U157']);
        expect(G.battlefield[0]?.wounds || 0).toBe(0);
        expect(
            G.players['0']?.fellowshipArea.find(
                (c) => c.instanceId === 'dev-rw-ranger'
            )?.wounds || 0
        ).toBe(0);
        expect(G.twilightPool).toBe(5);
    });
});
