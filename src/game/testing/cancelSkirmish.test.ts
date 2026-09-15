import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import type { Ability } from '../types';
import { parseAbilities } from '../../../scripts/convert/parsers';

const ESCAPE_ABILITY: Ability = {
    id: '4R300:0',
    phases: ['SKIRMISH'],
    cost: [{ exert: [{ count: 2, target: 'BEARER' }] }],
    effects: [
        {
            type: 'CANCEL_SKIRMISH',
            involving: 'BEARER',
            shadowMayPrevent: { removeTwilight: 1 },
        },
    ],
    source: 'ATTACHMENT',
    text: 'Skirmish: Exert bearer twice to cancel a skirmish involving him.',
};

const HALFLING_LEAF_ABILITY: Ability = {
    id: '17U106:0',
    phases: ['SKIRMISH'],
    cost: [
        {
            discardFromPlay: [
                {
                    count: 1,
                    target: [['PIPEWEED']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [
        {
            type: 'CANCEL_SKIRMISH',
            involving: [['UNBOUND', 'HOBBIT']],
        },
    ],
    source: 'SELF',
    text: 'Skirmish: Discard a pipeweed from play to cancel a skirmish involving an unbound Hobbit.',
};

function escapeSkirmishSetup(twilightPool = 0) {
    const escape = createCard({
        id: '4R300',
        title: 'Escape',
        type: 'CONDITION',
        kind: 'FREE_PEOPLE',
        culture: 'SHIRE',
        keywords: ['STEALTH'],
        actionPhases: ['SKIRMISH'],
        abilities: [ESCAPE_ABILITY],
    });
    const merry = createCompanion({
        id: 'merry',
        title: 'Merry',
        race: 'HOBBIT',
        culture: 'SHIRE',
        vitality: 4,
        instanceId: 'dev-merry',
        attachments: [escape],
    });
    const lurtz = createMinion({
        id: 'lurtz',
        instanceId: 'dev-lurtz',
        strength: 12,
        vitality: 3,
    });
    const window = createSkirmishActionWindow('skirmish_dev-merry');
    return createEngineClient({
        startPhase: 'skirmish',
        playerID: '0',
        G: {
            ...window,
            twilightPool,
            skirmishes: [
                {
                    id: 'skirmish_dev-merry',
                    companionId: 'dev-merry',
                    minionIds: ['dev-lurtz'],
                },
            ],
            battlefield: [lurtz],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [merry],
                }),
            },
        },
    });
}

describe('parseAbilities — cancel a skirmish', () => {
    it('Escape : exert bearer twice → cancel + prevent Ombre Ⓣ1', () => {
        const text =
            '<keyword>Stealth.</keyword> Bearer must be an unbound Hobbit. Limit 1 per character. <br><keyword>Skirmish: </keyword>Exert bearer twice to cancel a skirmish involving him. <br>Any Shadow player may remove <symbol>twilight1</symbol> to prevent this.';
        expect(parseAbilities(text, 'Escape', '4R300')).toEqual([
            {
                id: '4R300:0',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 2, target: 'BEARER' }] }],
                effects: [
                    {
                        type: 'CANCEL_SKIRMISH',
                        involving: 'BEARER',
                        shadowMayPrevent: { removeTwilight: 1 },
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(/cancel a skirmish involving him/i),
            },
        ]);
    });

    it('Boromir’s Gauntlets : même famille prevent Ombre', () => {
        const text =
            'Bearer must be a <symbol>gondor</symbol> Man. <br><keyword>Skirmish:</keyword> Exert bearer to cancel a skirmish involving bearer. Any Shadow player may remove <symbol>twilight1</symbol> to prevent this.';
        expect(parseAbilities(text, "Boromir's Gauntlets", '4C112')).toEqual([
            {
                id: '4C112:0',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
                effects: [
                    {
                        type: 'CANCEL_SKIRMISH',
                        involving: 'BEARER',
                        shadowMayPrevent: { removeTwilight: 1 },
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(/cancel a skirmish involving bearer/i),
            },
        ]);
    });

    it('Halfling Leaf : défausse pipeweed → cancel involving unbound Hobbit', () => {
        const text =
            '<keyword>Pipeweed.</keyword> To play, spot a Hobbit.<br><keyword>Skirmish:</keyword> Discard a pipeweed from play to cancel a skirmish involving an unbound Hobbit.';
        expect(parseAbilities(text, 'Halfling Leaf', '17U106')).toEqual([
            {
                id: '17U106:0',
                phases: ['SKIRMISH'],
                cost: [
                    {
                        discardFromPlay: [
                            {
                                count: 1,
                                target: [['PIPEWEED']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'CANCEL_SKIRMISH',
                        involving: [['UNBOUND', 'HOBBIT']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(/unbound Hobbit/i),
            },
        ]);
    });

    it('Gandalf’s Staff : exert named bearer twice (sans prevent)', () => {
        const text =
            'Bearer must be Gandalf. <br>The twilight cost of each <symbol>gandalf</symbol> spell is -1. <br><keyword>Skirmish:</keyword> Exert Gandalf twice to cancel a skirmish involving him.';
        expect(parseAbilities(text, "Gandalf's Staff", '2R22')).toEqual([
            {
                id: '2R22:0',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 2, target: 'BEARER' }] }],
                effects: [{ type: 'CANCEL_SKIRMISH', involving: 'BEARER' }],
                source: 'ATTACHMENT',
                text: expect.stringMatching(/Exert Gandalf twice/i),
            },
        ]);
    });
});

describe('CANCEL_SKIRMISH — runtime', () => {
    it('Évasion : sans crépuscule, annule tout de suite (prevent impossible)', () => {
        const engine = escapeSkirmishSetup(0);

        engine.moves.activateAbility('4R300', '4R300:0');

        const G = engine.getG();
        expect(G.skirmishes).toEqual([]);
        expect(G.activeSkirmishId).toBeUndefined();
        expect(G.actionWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
        expect(G.responseWindow).toBeUndefined();
        expect(G.battlefield.map((c) => c.id)).toEqual(['lurtz']);
        expect(G.battlefield[0]?.wounds || 0).toBe(0);
        expect(
            G.players['0']?.fellowshipArea[0]?.attachments?.[0]?.wounds || 0
        ).toBe(0);
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(2);

        engine.stop();
    });

    it('Évasion : pool ≥1 → Ombre passe → escarmouche annulée', () => {
        const engine = escapeSkirmishSetup(2);

        engine.moves.activateAbility('4R300', '4R300:0');

        let G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(2);
        expect(G.pendingEvent).toEqual({
            type: 'ABOUT_TO_CANCEL_SKIRMISH',
            skirmishId: 'skirmish_dev-merry',
            removeTwilight: 1,
        });
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('1');
        expect(G.skirmishes).toHaveLength(1);
        expect(G.twilightPool).toBe(2);

        engine.updatePlayerID('1');
        engine.moves.passResponseWindow();

        G = engine.getG();
        expect(G.skirmishes).toEqual([]);
        expect(G.pendingEvent).toBeUndefined();
        expect(G.responseWindow).toBeUndefined();
        expect(G.twilightPool).toBe(2);
        expect(G.battlefield.map((c) => c.id)).toEqual(['lurtz']);

        engine.stop();
    });

    it('Évasion : Ombre retire Ⓣ1 → prevent, escarmouche continue', () => {
        const engine = escapeSkirmishSetup(2);

        engine.moves.activateAbility('4R300', '4R300:0');
        engine.updatePlayerID('1');
        engine.moves.preventPendingEffect();

        const G = engine.getG();
        expect(G.skirmishes).toEqual([
            {
                id: 'skirmish_dev-merry',
                companionId: 'dev-merry',
                minionIds: ['dev-lurtz'],
            },
        ]);
        expect(G.activeSkirmishId).toBe('skirmish_dev-merry');
        expect(G.pendingEvent).toBeUndefined();
        expect(G.responseWindow).toBeUndefined();
        expect(G.twilightPool).toBe(1);
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(2);
        expect(G.actionWindow?.isOpen).toBe(true);
        expect(G.actionWindow?.activePlayerId).toBe('1');

        engine.stop();
    });

    it('Halfling Leaf : défausse Old Toby et annule le combat du Hobbit dissocié', () => {
        const leaf = createCard({
            id: '17U106',
            title: 'Halfling Leaf',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            keywords: ['PIPEWEED'],
            actionPhases: ['SKIRMISH'],
            abilities: [HALFLING_LEAF_ABILITY],
        });
        const toby = createCard({
            id: '1C305',
            title: 'Old Toby',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            keywords: ['PIPEWEED'],
        });
        const merry = createCompanion({
            id: 'merry',
            title: 'Merry',
            race: 'HOBBIT',
            culture: 'SHIRE',
            instanceId: 'dev-merry',
        });
        const orc = createMinion({ id: 'orc', instanceId: 'dev-orc' });
        const window = createSkirmishActionWindow('skirmish_dev-merry');
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...window,
                skirmishes: [
                    {
                        id: 'skirmish_dev-merry',
                        companionId: 'dev-merry',
                        minionIds: ['dev-orc'],
                    },
                ],
                battlefield: [orc],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [merry],
                        supportArea: [leaf, toby],
                    }),
                },
            },
        });

        engine.moves.activateAbility('17U106', '17U106:0', '1C305');

        const G = engine.getG();
        expect(G.skirmishes).toEqual([]);
        expect(G.players['0']?.discard.map((c) => c.id)).toEqual(['1C305']);
        expect(G.battlefield.map((c) => c.id)).toEqual(['orc']);

        engine.stop();
    });
});
