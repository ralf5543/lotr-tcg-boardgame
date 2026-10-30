import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getWhileKeywordRaws } from '../logic/stats/mechanics/whileModifier';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'While you have initiative, each <symbol>gollum</symbol> minion is **damage +1.** \n<keyword>Skirmish:</keyword>  Discard this condition to make a <symbol>gollum</symbol> minion strength +1 for each culture you can spot.';

const WHILE_INIT: Ability = {
    id: '10C24:while',
    phases: [],
    trigger: { type: 'WHILE', hasInitiative: true },
    cost: [],
    effects: [
        {
            type: 'MODIFY_KEYWORD',
            keyword: 'DAMAGE +1',
            target: [['GOLLUM', 'MINION']],
        },
    ],
    source: 'SELF',
    text: 'While you have initiative, each gollum minion is damage +1.',
};

const SKIRMISH: Ability = {
    id: '10C24:sk',
    phases: ['SKIRMISH'],
    cost: [{ discardFromPlay: [{ count: 1, target: 'SELF' }] }],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 1,
            target: [['GOLLUM', 'MINION']],
            expiresAtPhase: 'SKIRMISH',
            perDistinctCulture: true,
        },
    ],
    source: 'SELF',
    text: 'Skirmish: Discard this to make a gollum minion strength +1 for each culture…',
};

describe('Unabated in Malice 10C24', () => {
    it('analyse complète While + Combat per culture', () => {
        expect(parseAbilities(CSV_TEXT, 'Unabated in Malice', '10C24')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE', hasInitiative: true },
                    effects: [
                        {
                            type: 'MODIFY_KEYWORD',
                            keyword: 'DAMAGE +1',
                            target: [['GOLLUM', 'MINION']],
                        },
                    ],
                }),
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [
                        {
                            discardFromPlay: [{ count: 1, target: 'SELF' }],
                        },
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'ADD_TEMP_STAT',
                            value: 1,
                            perDistinctCulture: true,
                            target: [['GOLLUM', 'MINION']],
                        }),
                    ],
                }),
            ])
        );
        const card = getCardById('10C24');
        expect(
            card?.abilities?.some(
                (ab) =>
                    ab.trigger?.type === 'WHILE' &&
                    ab.trigger.hasInitiative
            )
        ).toBe(true);
        expect(
            card?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) =>
                        e.type === 'ADD_TEMP_STAT' && e.perDistinctCulture
                )
            )
        ).toBe(true);
    });

    it('initiative Ombre → séide Gollum Damage +1', () => {
        const condition = createCard({
            id: '10C24',
            instanceId: 'unabated',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'GOLLUM',
            abilities: [WHILE_INIT],
        });
        const gollum = createMinion({
            id: 'gollum',
            instanceId: 'gollum',
            culture: 'GOLLUM',
            race: 'GOLLUM',
            type: 'MINION',
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: 'frodo', instanceId: 'frodo' }),
                    ],
                    hand: [], // FP < 4 → Ombre a l’initiative
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
            battlefield: [gollum],
        });
        // FP main vide → Ombre a l’initiative
        const kws = getWhileKeywordRaws(G, gollum);
        expect(kws.some((k) => /DAMAGE\s*\+\s*1/i.test(String(k)))).toBe(true);
        expect(getKeywordValue(gollum, 'DAMAGE', G)).toBeGreaterThanOrEqual(1);
    });

    it('Combat : défausse → force + cultures distinctes', () => {
        const condition = createCard({
            id: '10C24',
            instanceId: 'unabated',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'GOLLUM',
            abilities: [SKIRMISH],
        });
        const gollum = createMinion({
            id: 'gollum',
            instanceId: 'gollum',
            culture: 'GOLLUM',
            type: 'MINION',
            strength: 5,
        });
        const uruk = createMinion({
            id: 'uruk',
            instanceId: 'uruk',
            culture: 'ISENGARD',
            type: 'MINION',
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo',
                            culture: 'SHIRE',
                        }),
                    ],
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
            battlefield: [gollum, uruk],
        });
        // Cultures : SHIRE + GOLLUM + ISENGARD = 3
        expect(
            applyAbilityEffect(G, condition, SKIRMISH, 'gollum')
        ).toBe(true);
        expect(G.tempModifiers?.some((m) => m.value === 3)).toBe(true);
    });

    it('preset DEV', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_UNABATED');
        expect(G.players['1']!.supportArea?.[0]?.id).toBe('10C24');
    });
});
