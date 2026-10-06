import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import {
    playStackedMinionFromCard,
    stackCardOnHost,
    takeStackedCardToHand,
} from '../logic/cardStack';
import {
    createCard,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

describe('parseAbilities — stack sur carte (Narsil / Web)', () => {
    it('Fragments de Narsil : stack from hand + take into hand', () => {
        expect(
            parseAbilities(
                '<keyword>Fellowship:</keyword> Stack a <symbol>gondor</symbol> card from hand here. <keyword>Fellowship:</keyword> Add <symbol>twilight1</symbol> to take a card stacked here into hand.',
                'The Shards of Narsil',
                '3R44'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['FELLOWSHIP'],
                cost: [],
                effects: [
                    {
                        type: 'STACK_ON_SELF',
                        from: 'HAND',
                        target: [['GONDOR']],
                    },
                ],
                source: 'SELF',
            }),
            expect.objectContaining({
                phases: ['FELLOWSHIP'],
                cost: [{ addTwilight: 1 }],
                effects: [{ type: 'TAKE_FROM_STACK' }],
                source: 'SELF',
            }),
        ]);
    });

    it('Web : spot stack (max 3) + play from card stack', () => {
        expect(
            parseAbilities(
                '<keyword>Regroup:</keyword> If there are fewer than 3 cards stacked here, spot your Orc or <symbol>gollum</symbol> minion to stack that minion here. <keyword>Shadow:</keyword> Play a <symbol>gollum</symbol> minion stacked here as if played from hand.',
                'Web',
                '8C30'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [],
                effects: [
                    {
                        type: 'STACK_ON_SELF',
                        from: 'PLAY',
                        target: [
                            ['ORC', 'MINION'],
                            ['GOLLUM', 'MINION'],
                        ],
                        maxStacked: 3,
                    },
                ],
                source: 'SELF',
            }),
            expect.objectContaining({
                phases: ['SHADOW'],
                cost: [],
                effects: [
                    {
                        type: 'PLAY_FROM_CARD_STACK',
                        target: [['GOLLUM', 'MINION']],
                    },
                ],
                source: 'SELF',
            }),
        ]);
    });
});

describe('runtime — stack sur carte', () => {
    const stackFromHand: Ability = {
        id: '3R44:0',
        phases: ['FELLOWSHIP'],
        cost: [],
        effects: [
            {
                type: 'STACK_ON_SELF',
                from: 'HAND',
                target: [['GONDOR']],
            },
        ],
        source: 'SELF',
    };

    const takeFromStack: Ability = {
        id: '3R44:1',
        phases: ['FELLOWSHIP'],
        cost: [{ addTwilight: 1 }],
        effects: [{ type: 'TAKE_FROM_STACK' }],
        source: 'SELF',
    };

    const stackFromPlay: Ability = {
        id: '8C30:0',
        phases: ['REGROUP'],
        cost: [],
        effects: [
            {
                type: 'STACK_ON_SELF',
                from: 'PLAY',
                target: [
                    ['ORC', 'MINION'],
                    ['GOLLUM', 'MINION'],
                ],
                maxStacked: 3,
            },
        ],
        source: 'SELF',
    };

    const playFromCardStack: Ability = {
        id: '8C30:1',
        phases: ['SHADOW'],
        cost: [],
        effects: [
            {
                type: 'PLAY_FROM_CARD_STACK',
                target: [['GOLLUM', 'MINION']],
            },
        ],
        source: 'SELF',
    };

    it('Narsil : empile une carte gondor de la main', () => {
        const narsil = createCard({
            id: '3R44',
            instanceId: 'narsil',
            kind: 'FREE_PEOPLE',
            type: 'ARTIFACT',
            culture: 'GONDOR',
            subtype: 'SUPPORT-AREA',
            abilities: [stackFromHand],
        });
        const event = createCard({
            id: '3U46',
            instanceId: 'still-sharp',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            culture: 'GONDOR',
            title: 'Still Sharp',
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    hand: [event],
                    supportArea: [narsil],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(
            abilityHasLegalEffectTarget(G, narsil, stackFromHand)
        ).toBe(true);
        expect(
            getEffectDesignationCandidates(G, narsil, stackFromHand).map(
                (c) => c.instanceId
            )
        ).toEqual(['still-sharp']);

        expect(
            applyAbilityEffect(G, narsil, stackFromHand, ['still-sharp'])
        ).toBe(true);
        expect(G.players['0'].hand).toHaveLength(0);
        expect(narsil.stacked).toHaveLength(1);
        expect(narsil.stacked![0].instanceId).toBe('still-sharp');
    });

    it('Narsil : ajoute crépuscule et reprend la carte empilée', () => {
        const stacked = createCard({
            id: '3U46',
            instanceId: 'still-sharp',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            culture: 'GONDOR',
        });
        const narsil = createCard({
            id: '3R44',
            instanceId: 'narsil',
            kind: 'FREE_PEOPLE',
            type: 'ARTIFACT',
            culture: 'GONDOR',
            subtype: 'SUPPORT-AREA',
            stacked: [stacked],
            abilities: [takeFromStack],
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    hand: [],
                    supportArea: [narsil],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(payAbilityCost(G, narsil, takeFromStack.cost)).toBe(true);
        expect(G.twilightPool).toBe(1);
        expect(
            applyAbilityEffect(G, narsil, takeFromStack, ['still-sharp'])
        ).toBe(true);
        expect(narsil.stacked).toHaveLength(0);
        expect(G.players['0'].hand.map((c) => c.instanceId)).toEqual([
            'still-sharp',
        ]);
    });

    it('Web : empile un séide orc (plafond 3)', () => {
        const web = createCard({
            id: '8C30',
            instanceId: 'web',
            kind: 'SHADOW',
            type: 'POSSESSION',
            culture: 'GOLLUM',
            subtype: 'SUPPORT-AREA',
            abilities: [stackFromPlay],
        });
        const orc = createMinion({
            id: 'orc1',
            instanceId: 'orc1',
            culture: 'ORC',
            race: 'ORC',
            twilightCost: 3,
        });
        const G = createGameState({
            fpPlayerId: '0',
            battlefield: [orc],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    supportArea: [web],
                }),
            },
        });

        expect(abilityHasLegalEffectTarget(G, web, stackFromPlay)).toBe(true);
        expect(stackCardOnHost(G, web, orc, 'PLAY', '1', 3)).toBe(true);
        expect(G.battlefield).toHaveLength(0);
        expect(web.stacked).toHaveLength(1);

        web.stacked = [
            createMinion({ id: 'a', instanceId: 'a' }),
            createMinion({ id: 'b', instanceId: 'b' }),
            createMinion({ id: 'c', instanceId: 'c' }),
        ];
        const other = createMinion({
            id: 'orc2',
            instanceId: 'orc2',
            culture: 'ORC',
            race: 'ORC',
        });
        G.battlefield = [other];
        expect(
            abilityHasLegalEffectTarget(G, web, stackFromPlay)
        ).toBe(false);
        expect(stackCardOnHost(G, web, other, 'PLAY', '1', 3)).toBe(false);
    });

    it('Web : joue un séide gollum empilé en payant le crépuscule', () => {
        const smeagol = createMinion({
            id: 'smeagol',
            instanceId: 'smeagol',
            culture: 'GOLLUM',
            twilightCost: 2,
            title: 'Sméagol',
        });
        const web = createCard({
            id: '8C30',
            instanceId: 'web',
            kind: 'SHADOW',
            type: 'POSSESSION',
            culture: 'GOLLUM',
            subtype: 'SUPPORT-AREA',
            stacked: [smeagol],
            abilities: [playFromCardStack],
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 2,
            battlefield: [],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    supportArea: [web],
                }),
            },
        });

        expect(
            abilityHasLegalEffectTarget(G, web, playFromCardStack)
        ).toBe(true);
        expect(
            playStackedMinionFromCard(G, web, smeagol, '1')
        ).toBe(2);
        expect(G.twilightPool).toBe(0);
        expect(web.stacked).toHaveLength(0);
        expect(G.battlefield.map((c) => c.instanceId)).toEqual(['smeagol']);
    });

    it('takeStackedCardToHand refuse une carte absente', () => {
        const host = createCard({
            id: 'host',
            instanceId: 'host',
            kind: 'FREE_PEOPLE',
            type: 'ARTIFACT',
            stacked: [],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { supportArea: [host] }),
                '1': createPlayerState('1'),
            },
        });
        expect(takeStackedCardToHand(G, host, 'missing', '0')).toBe(false);
    });
});
