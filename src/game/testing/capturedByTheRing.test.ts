import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import {
    getDeckOrDiscardBrowsePool,
    getDeckOrDiscardPlayCandidates,
    playCardFromDeckOrDiscard,
} from '../logic/playFromOutOfPlay';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

const capturedAbility: Ability = {
    id: '7C53:0',
    phases: [],
    cost: [],
    effects: [
        {
            type: 'PLAY_FROM_DECK_OR_DISCARD',
            target: [['Gollum']],
        },
        { type: 'ADD_THREATS', count: 1 },
    ],
    source: 'SELF',
};

describe('parseAbilities — Captured by the Ring', () => {
    it('parse Play Gollum from deck or discard to add a threat', () => {
        expect(
            parseAbilities(
                'Play Gollum from your draw deck or discard pile to add a threat.',
                'Captured by the Ring',
                '7C53'
            )
        ).toEqual([
            expect.objectContaining({
                phases: [],
                cost: [],
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        target: [['Gollum']],
                    },
                    { type: 'ADD_THREATS', count: 1 },
                ],
                source: 'SELF',
            }),
        ]);
    });
});

describe('runtime — play from deck or discard', () => {
    it('browse = toute la pioche + défausse ; candidats = Gollum jouable', () => {
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum-1',
            title: 'Gollum',
            culture: 'GOLLUM',
            twilightCost: 2,
            isUnique: true,
        });
        const other = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            title: 'Orc',
            culture: 'ORC',
            twilightCost: 3,
        });
        const inDiscard = createMinion({
            id: '7C59',
            instanceId: 'gollum-disc',
            title: 'Gollum',
            culture: 'GOLLUM',
            twilightCost: 2,
            isUnique: true,
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 5,
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    deck: [other, gollum],
                    discard: [inDiscard],
                    threats: 0,
                }),
            },
        });

        const browse = getDeckOrDiscardBrowsePool(G, '1');
        expect(browse.deck).toHaveLength(2);
        expect(browse.discard).toHaveLength(1);

        const candidates = getDeckOrDiscardPlayCandidates(
            G,
            '1',
            [['Gollum']],
            'shadow'
        );
        expect(candidates.map((c) => c.instanceId).sort()).toEqual([
            'gollum-1',
            'gollum-disc',
        ]);
    });

    it('Captured : joue Gollum depuis la pioche, ajoute une menace, mélange', () => {
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum-1',
            title: 'Gollum',
            culture: 'GOLLUM',
            twilightCost: 2,
            isUnique: true,
        });
        const filler = createCard({
            id: 'filler',
            instanceId: 'filler-1',
            kind: 'SHADOW',
            type: 'CONDITION',
            title: 'Filler',
        });
        const event = createCard({
            id: '7C53',
            instanceId: 'captured',
            kind: 'SHADOW',
            type: 'EVENT',
            culture: 'GOLLUM',
            twilightCost: 0,
            phases: ['SHADOW'],
            abilities: [capturedAbility],
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 4,
            battlefield: [],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'comp',
                            instanceId: 'comp',
                        }),
                    ],
                }),
                '1': createPlayerState('1', {
                    deck: [filler, gollum],
                    discard: [],
                    hand: [event],
                    supportArea: [],
                    threats: 0,
                }),
            },
        });

        expect(
            abilityHasLegalEffectTarget(G, event, capturedAbility)
        ).toBe(true);

        expect(
            applyAbilityEffect(G, event, capturedAbility, ['gollum-1'])
        ).toBe(true);

        expect(G.twilightPool).toBe(2);
        expect(G.battlefield.map((c) => c.instanceId)).toEqual(['gollum-1']);
        expect(G.players['1'].deck.map((c) => c.instanceId)).toEqual([
            'filler-1',
        ]);
        expect(G.players['0'].threats).toBe(1);
    });

    it('refuse une carte hors filtre même si en pioche', () => {
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            title: 'Orc Scout',
            culture: 'ORC',
            twilightCost: 2,
        });
        const G = createGameState({
            twilightPool: 5,
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { deck: [orc] }),
            },
        });
        expect(
            playCardFromDeckOrDiscard(G, '1', 'orc-1', [['Gollum']])
        ).toBeNull();
        expect(G.battlefield).toHaveLength(0);
        expect(G.players['1'].deck).toHaveLength(1);
    });

    it('joue depuis la défausse', () => {
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum-d',
            title: 'Gollum',
            culture: 'GOLLUM',
            twilightCost: 2,
            isUnique: true,
        });
        const G = createGameState({
            twilightPool: 2,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: 'c', instanceId: 'c' }),
                    ],
                }),
                '1': createPlayerState('1', {
                    deck: [],
                    discard: [gollum],
                    threats: 0,
                }),
            },
        });

        expect(
            playCardFromDeckOrDiscard(G, '1', 'gollum-d', [['Gollum']])
                ?.instanceId
        ).toBe('gollum-d');
        expect(G.players['1'].discard).toHaveLength(0);
        expect(G.battlefield[0]?.instanceId).toBe('gollum-d');
        expect(G.twilightPool).toBe(0);
    });
});
