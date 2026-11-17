import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { applyEventAbility } from '../engine/abilities/playEventAbility';
import { createEngineClient } from './createEngineClient';
import {
    createGameState,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import { parseAbilities } from '../../../scripts/convert/parsers';

describe('Coup Tourbillonnant (4C260)', () => {
    const event = getCardById('4C260')!;
    const ability = event.abilities![0]!;

    it('parse : blesser un compagnon ou allié combattant un Homme pillard', () => {
        const parsed = parseAbilities(
            '<keyword>Skirmish:</keyword> Wound a companion or ally skirmishing a <symbol>raider</symbol> Man.',
            'Whirling Strike',
            '4C260'
        );
        expect(parsed?.[0]).toMatchObject({
            phases: ['SKIRMISH'],
            cost: [],
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: [['CHARACTER']],
                    involving: [['RAIDER', 'MAN']],
                    match: [['COMPANION'], ['ALLY']],
                },
            ],
        });
        expect(ability.effects).toEqual(parsed![0]!.effects);
    });

    it('demande la cible d’effet ; blesse le rôdeur', () => {
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
        const pending = { ...event, instanceId: 'whirl' };
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
        expect(abilityNeedsCostDesignation(G, pending, ability)).toBe(false);
        expect(abilityNeedsEffectDesignation(G, pending, ability)).toBe(true);
        expect(
            getEffectDesignationCandidates(G, pending, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['ranger']);

        expect(applyEventAbility(G, pending, 'skirmish', 'ranger')).toBe(true);
        expect(ranger.wounds).toBe(1);
        expect(raider.wounds || 0).toBe(0);
    });

    it('joue via playCard Ombre', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'dev-ws-frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'dev-ws-ranger',
            wounds: 0,
        };
        const raider = {
            ...getCardById('4U249')!,
            instanceId: 'dev-ws-raider',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const pending = { ...event, instanceId: 'dev-ws-event' };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '1',
            G: {
                ...createSkirmishActionWindow('dev-ws-sk', '1'),
                twilightPool: 5,
                fpPlayerId: '0',
                battlefield: [raider],
                skirmishes: [
                    {
                        id: 'dev-ws-sk',
                        companionId: 'dev-ws-ranger',
                        minionIds: ['dev-ws-raider'],
                    },
                ],
                activeSkirmishId: 'dev-ws-sk',
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

        engine.moves.playCard(0, 'dev-ws-ranger');
        const G = engine.getG();
        expect(G.players['1']?.hand).toHaveLength(0);
        expect(G.players['1']?.discard?.[0]?.id).toBe('4C260');
        expect(
            G.players['0']?.fellowshipArea.find(
                (c) => c.instanceId === 'dev-ws-ranger'
            )?.wounds
        ).toBe(1);
    });
});
