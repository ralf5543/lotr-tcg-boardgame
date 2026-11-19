import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCard,
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability, SiteCardState } from '../types';

const TEXT =
    'Bearer must be a <symbol>gondor</symbol> Man. \nWhile bearer is a ranger or at a river site, he or she is **Damage +1.**';

const bladeAbility: Ability = {
    id: '11U59:0',
    phases: [],
    trigger: {
        type: 'WHILE',
        bearerKeywordOrAtSiteKeyword: {
            bearerKeyword: 'RANGER',
            siteKeyword: 'RIVER',
        },
    },
    cost: [],
    effects: [
        {
            type: 'MODIFY_KEYWORD',
            keyword: 'DAMAGE +1',
            target: 'BEARER',
        },
    ],
    source: 'ATTACHMENT',
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

describe('Lame gondorienne (11U59)', () => {
    it('parse : rôdeur OU site rivière → Damage +1 au porteur', () => {
        expect(
            parseAbilities(TEXT, 'Gondorian Blade', '11U59')?.[0]
        ).toMatchObject({
            trigger: {
                type: 'WHILE',
                bearerKeywordOrAtSiteKeyword: {
                    bearerKeyword: 'RANGER',
                    siteKeyword: 'RIVER',
                },
            },
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: 'DAMAGE +1',
                    target: 'BEARER',
                },
            ],
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('11U59')!;
        expect(card.abilities?.[0]).toMatchObject({
            trigger: {
                type: 'WHILE',
                bearerKeywordOrAtSiteKeyword: {
                    bearerKeyword: 'RANGER',
                    siteKeyword: 'RIVER',
                },
            },
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: 'DAMAGE +1',
                    target: 'BEARER',
                },
            ],
        });
    });

    it('accorde Damage +1 si le porteur est rôdeur (hors rivière)', () => {
        const blade = createCard({
            id: '11U59',
            instanceId: 'blade',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            culture: 'GONDOR',
            abilities: [bladeAbility],
        });
        const ranger = createCompanion({
            id: '7C116',
            instanceId: 'ranger',
            title: 'Ranger of Osgiliath',
            culture: 'GONDOR',
            race: 'MAN',
            keywords: ['RANGER'],
            attachments: [blade],
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: pathWith(
                0,
                createSite({
                    id: '11S237',
                    keywords: ['PLAINS'],
                    siteNumber: 1,
                })
            ),
            players: {
                '0': createPlayerState('0', { fellowshipArea: [ranger] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getKeywordValue(ranger, 'DAMAGE', G)).toBe(1);
    });

    it('accorde Damage +1 si site rivière (porteur non rôdeur)', () => {
        const blade = createCard({
            id: '11U59',
            instanceId: 'blade',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            culture: 'GONDOR',
            abilities: [bladeAbility],
        });
        const man = createCompanion({
            id: '7C82',
            instanceId: 'cirion',
            title: 'Cirion',
            culture: 'GONDOR',
            race: 'MAN',
            keywords: [],
            attachments: [blade],
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: pathWith(
                0,
                createSite({
                    id: '15U187',
                    keywords: ['RIVER'],
                    siteNumber: 1,
                })
            ),
            players: {
                '0': createPlayerState('0', { fellowshipArea: [man] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getKeywordValue(man, 'DAMAGE', G)).toBe(1);
    });

    it('n’accorde rien hors rôdeur et hors rivière', () => {
        const blade = createCard({
            id: '11U59',
            instanceId: 'blade',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            culture: 'GONDOR',
            abilities: [bladeAbility],
        });
        const man = createCompanion({
            id: '7C82',
            instanceId: 'cirion',
            title: 'Cirion',
            culture: 'GONDOR',
            race: 'MAN',
            keywords: [],
            attachments: [blade],
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: pathWith(
                0,
                createSite({
                    id: '11S237',
                    keywords: ['PLAINS'],
                    siteNumber: 1,
                })
            ),
            players: {
                '0': createPlayerState('0', { fellowshipArea: [man] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getKeywordValue(man, 'DAMAGE', G)).toBe(-1);
    });
});
