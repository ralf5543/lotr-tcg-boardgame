import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability, SiteCardState } from '../types';

const whileUnderground2: Ability = {
    id: '11S115:0',
    phases: [],
    trigger: { type: 'WHILE', atSiteKeyword: 'UNDERGROUND' },
    cost: [],
    effects: [
        {
            type: 'MODIFY_STAT',
            stat: 'STRENGTH',
            value: 2,
            target: 'SELF',
        },
    ],
    source: 'SELF',
};

function pathWith(
    index: number,
    site: SiteCardState
): (SiteCardState | null)[] {
    const path = Array.from({ length: 9 }, () => null) as (
        | SiteCardState
        | null
    )[];
    path[index] = site;
    return path;
}

describe('While at a … site → force', () => {
    it('booste le séide sur un site UNDERGROUND', () => {
        const minion = createMinion({
            id: '11S115',
            instanceId: 'denizen',
            strength: 9,
            abilities: [whileUnderground2],
        });
        const G = createGameState({
            path: pathWith(
                0,
                createSite({
                    id: '11S263',
                    keywords: ['UNDERGROUND'],
                    siteNumber: 1,
                })
            ),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 0,
                    fellowshipArea: [],
                }),
            },
            battlefield: [minion],
            fpPlayerId: '0',
        });

        expect(getCalculatedStrength(G, minion)).toBe(11);
    });

    it('n’applique pas le bonus hors terrain', () => {
        const minion = createMinion({
            id: '11S115',
            instanceId: 'denizen',
            strength: 9,
            abilities: [whileUnderground2],
        });
        const G = createGameState({
            path: pathWith(
                2,
                createSite({
                    id: 'plains',
                    keywords: ['PLAINS'],
                    siteNumber: 3,
                })
            ),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
            },
            battlefield: [minion],
        });

        expect(getCalculatedStrength(G, minion)).toBe(9);
    });

    it('booste un compagnon sur FOREST', () => {
        const companion = createCompanion({
            id: '11C27',
            instanceId: 'sentinel',
            strength: 5,
            abilities: [
                {
                    id: '11C27:0',
                    phases: [],
                    trigger: { type: 'WHILE', atSiteKeyword: 'FOREST' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const G = createGameState({
            path: pathWith(
                4,
                createSite({
                    id: '11S231',
                    keywords: ['FOREST'],
                    siteNumber: 5,
                })
            ),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 4,
                    fellowshipArea: [companion],
                }),
            },
        });

        expect(getCalculatedStrength(G, companion)).toBe(7);
    });
});

describe('While at a … site → keyword', () => {
    it('accorde Fierce sur BATTLEGROUND', () => {
        const minion = createMinion({
            id: '11C73',
            instanceId: 'corps',
            abilities: [
                {
                    id: '11C73:0',
                    phases: [],
                    trigger: { type: 'WHILE', atSiteKeyword: 'BATTLEGROUND' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_KEYWORD',
                            keyword: 'FIERCE',
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const atBattleground = createGameState({
            path: pathWith(
                6,
                createSite({
                    keywords: ['BATTLEGROUND'],
                    siteNumber: 7,
                })
            ),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 6 }),
            },
            battlefield: [minion],
        });
        const elsewhere = createGameState({
            path: pathWith(
                0,
                createSite({
                    keywords: ['UNDERGROUND'],
                    siteNumber: 1,
                })
            ),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
            },
            battlefield: [minion],
        });

        expect(getKeywordValue(minion, 'FIERCE', atBattleground)).toBe(0);
        expect(getKeywordValue(minion, 'FIERCE', elsewhere)).toBe(-1);
    });

    it('accorde Damage +1 au porteur sur MOUNTAIN', () => {
        const axe = createCard({
            id: '11U3',
            instanceId: 'axe',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            subtype: 'HAND-WEAPON',
            abilities: [
                {
                    id: '11U3:0',
                    phases: [],
                    trigger: { type: 'WHILE', atSiteKeyword: 'MOUNTAIN' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_KEYWORD',
                            keyword: 'DAMAGE +1',
                            target: 'BEARER',
                        },
                    ],
                    source: 'ATTACHMENT',
                },
            ],
        });
        const dwarf = createCompanion({
            id: 'gimli',
            instanceId: 'gimli',
            race: 'DWARF',
            attachments: [axe],
        });
        const G = createGameState({
            path: pathWith(
                7,
                createSite({
                    keywords: ['MOUNTAIN'],
                    siteNumber: 8,
                })
            ),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 7,
                    fellowshipArea: [dwarf],
                }),
            },
        });

        expect(getKeywordValue(dwarf, 'DAMAGE', G)).toBe(1);
    });
});

describe('With Doom — Gandalf nommé vs culture GANDALF', () => {
    const withDoomUnderground: Ability = {
        id: '12U36:0',
        phases: [],
        trigger: { type: 'WHILE', atSiteKeyword: 'UNDERGROUND' },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'MUSTER',
                target: [['Gandalf']],
            },
        ],
        source: 'SELF',
    };
    const withDoomBattleground: Ability = {
        id: '12U36:1',
        phases: [],
        trigger: { type: 'WHILE', atSiteKeyword: 'BATTLEGROUND' },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'MUSTER',
                target: [['GANDALF', 'CHARACTER']],
            },
        ],
        source: 'SELF',
    };

    it('underground : Muster pour Gandalf seulement, pas l’Ent', () => {
        const gandalf = createCompanion({
            id: '1R72',
            instanceId: 'gandalf',
            title: 'Gandalf',
            culture: 'GANDALF',
            race: 'WIZARD',
        });
        const ent = createCompanion({
            id: '6C33',
            instanceId: 'quickbeam',
            title: 'Quickbeam',
            culture: 'GANDALF',
            race: 'ENT',
        });
        const condition = createCard({
            id: '12U36',
            instanceId: 'with-doom',
            type: 'CONDITION',
            culture: 'GANDALF',
            abilities: [withDoomUnderground, withDoomBattleground],
        });
        const G = createGameState({
            path: pathWith(
                0,
                createSite({
                    keywords: ['UNDERGROUND'],
                    siteNumber: 1,
                })
            ),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [gandalf, ent],
                    supportArea: [condition],
                }),
            },
            fpPlayerId: '0',
        });

        expect(getKeywordValue(gandalf, 'MUSTER', G)).toBeGreaterThanOrEqual(0);
        expect(getKeywordValue(ent, 'MUSTER', G)).toBe(-1);
    });

    it('battleground : Muster pour chaque personnage culture Gandalf (Ent inclus)', () => {
        const gandalf = createCompanion({
            id: '1R72',
            instanceId: 'gandalf',
            title: 'Gandalf',
            culture: 'GANDALF',
            race: 'WIZARD',
        });
        const ent = createCompanion({
            id: '6C33',
            instanceId: 'quickbeam',
            title: 'Quickbeam',
            culture: 'GANDALF',
            race: 'ENT',
        });
        const condition = createCard({
            id: '12U36',
            instanceId: 'with-doom',
            type: 'CONDITION',
            culture: 'GANDALF',
            abilities: [withDoomUnderground, withDoomBattleground],
        });
        const G = createGameState({
            path: pathWith(
                6,
                createSite({
                    keywords: ['BATTLEGROUND'],
                    siteNumber: 7,
                })
            ),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 6,
                    fellowshipArea: [gandalf, ent],
                    supportArea: [condition],
                }),
            },
            fpPlayerId: '0',
        });

        expect(getKeywordValue(gandalf, 'MUSTER', G)).toBeGreaterThanOrEqual(0);
        expect(getKeywordValue(ent, 'MUSTER', G)).toBeGreaterThanOrEqual(0);
    });
});
