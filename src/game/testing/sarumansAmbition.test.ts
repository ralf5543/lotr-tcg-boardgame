import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createMinion,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import type { Ability } from '../types';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getWhileTwilightCostModifier } from '../logic/stats/mechanics/whileModifier';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { createGameState } from './createGameState';

const AMBITION_WHILE: Ability = {
    id: '1C133:0',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [
        {
            type: 'MODIFY_STAT',
            stat: 'TWILIGHT_COST',
            value: -1,
            target: [['ISENGARD', 'EVENT']],
        },
    ],
    source: 'SELF',
    text: 'The twilight cost of your isengard events is -1.',
};

const AMBITION_SKIRMISH: Ability = {
    id: '1C133:1',
    phases: ['SKIRMISH'],
    cost: [{ discardFromPlay: [{ count: 1, target: 'SELF' }] }],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 2,
            target: [['URUK-HAI']],
            expiresAtPhase: 'SKIRMISH',
        },
    ],
    source: 'SELF',
    text: 'Skirmish: Discard this to make an Uruk-hai strength +2.',
};

describe("parseAbilities — Saruman's Ambition", () => {
    it('réduction événements isengard + discard-self make Uruk', () => {
        const text =
            'The twilight cost of your <symbol>isengard</symbol> events is -1.  <br><keyword>Skirmish:</keyword> Discard this condition to make an Uruk-hai strength +2.';
        expect(parseAbilities(text, "Saruman's Ambition", '1C133')).toEqual([
            {
                id: '1C133:0',
                phases: ['SKIRMISH'],
                cost: [
                    {
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: [['URUK-HAI']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Discard this to make an Uruk-hai strength \+2/i
                ),
            },
            {
                id: '1C133:1',
                phases: [],
                trigger: { type: 'WHILE' },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'TWILIGHT_COST',
                        value: -1,
                        target: [['ISENGARD', 'EVENT']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /twilight cost of your isengard events is -1/i
                ),
            },
        ]);
    });
});

describe("Saruman's Ambition — runtime", () => {
    it('réduit le coût d’un événement isengard de 1', () => {
        const ambition = createCard({
            id: '1C133',
            title: "Saruman's Ambition",
            type: 'CONDITION',
            kind: 'SHADOW',
            culture: 'ISENGARD',
            abilities: [AMBITION_WHILE],
        });
        const event = createCard({
            id: 'ev',
            title: 'Isengard Event',
            type: 'EVENT',
            kind: 'SHADOW',
            culture: 'ISENGARD',
            twilightCost: 3,
            phases: ['SHADOW'],
        });

        const G = createGameState({
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    supportArea: [ambition],
                    hand: [event],
                }),
            },
        });

        expect(getWhileTwilightCostModifier(G, event)).toBe(-1);
        expect(getEffectiveTwilightCost(event, 0, -1)).toBe(2);
    });

    it('ne réduit pas un événement autre culture', () => {
        const ambition = createCard({
            id: '1C133',
            title: "Saruman's Ambition",
            type: 'CONDITION',
            kind: 'SHADOW',
            culture: 'ISENGARD',
            abilities: [AMBITION_WHILE],
        });
        const event = createCard({
            id: 'ev',
            title: 'Moria Event',
            type: 'EVENT',
            kind: 'SHADOW',
            culture: 'MORIA',
            twilightCost: 3,
            phases: ['SHADOW'],
        });

        const G = createGameState({
            players: {
                '1': createPlayerState('1', {
                    supportArea: [ambition],
                    hand: [event],
                }),
            },
        });

        expect(getWhileTwilightCostModifier(G, event)).toBe(0);
    });

    it('skirmish : défausse la situation et +2 force à l’Uruk', () => {
        const ambition = createCard({
            id: '1C133',
            title: "Saruman's Ambition",
            type: 'CONDITION',
            kind: 'SHADOW',
            culture: 'ISENGARD',
            actionPhases: ['SKIRMISH'],
            abilities: [AMBITION_SKIRMISH],
        });
        const uruk = createMinion({
            id: 'uruk',
            instanceId: 'dev-uruk',
            title: 'Uruk Scout',
            race: 'URUK-HAI',
            culture: 'ISENGARD',
            strength: 8,
            vitality: 2,
        });
        const companion = createCard({
            id: 'comp',
            instanceId: 'dev-comp',
            kind: 'FREE_PEOPLE',
            type: 'COMPANION',
            title: 'Companion',
            strength: 6,
            vitality: 3,
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '1',
            G: {
                ...createSkirmishActionWindow('skirmish_dev-comp', '1'),
                battlefield: [uruk],
                skirmishes: [
                    {
                        id: 'skirmish_dev-comp',
                        companionId: 'dev-comp',
                        minionIds: ['dev-uruk'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [ambition],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1C133', '1C133:1', 'dev-uruk');

        const G = engine.getG();
        expect(G.players['1']?.supportArea).toHaveLength(0);
        expect(G.players['1']?.discard[0]?.id).toBe('1C133');
        expect(getCalculatedStrength(G, G.battlefield[0])).toBe(10);

        engine.stop();
    });
});
