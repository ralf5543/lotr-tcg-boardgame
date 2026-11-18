import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe("J'Irai (7C105)", () => {
    const text =
        'Bearer must be a <symbol>gondor</symbol> Man. <br>If you have initiative, bearer is defender +1.';

    it('parse : WHILE initiative → DEFENDER +1 sur le détenteur', () => {
        expect(parseAbilities(text, 'I Will Go', '7C105')?.[0]).toMatchObject({
            trigger: { type: 'WHILE', hasInitiative: true },
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: 'DEFENDER +1',
                    target: 'BEARER',
                },
            ],
            source: 'ATTACHMENT',
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('7C105')!;
        expect(card.abilities?.[0]).toMatchObject({
            trigger: { type: 'WHILE', hasInitiative: true },
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: 'DEFENDER +1',
                    target: 'BEARER',
                },
            ],
        });
    });

    it('avec initiative : détenteur DEFENDER +1 ; sans : rien', () => {
        const condition = {
            ...getCardById('7C105')!,
            instanceId: 'i-will-go',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            attachments: [condition],
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );

        const withInit = createGameState({
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [ranger],
                    // Initiative FP = ≥ 4 cartes en main.
                    hand: [
                        cloneHand('1C119', 'h1'),
                        cloneHand('1C119', 'h2'),
                        cloneHand('1C119', 'h3'),
                        cloneHand('1C106', 'h4'),
                    ],
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', {
                    hand: [],
                    currentSiteIndex: 3,
                }),
            },
        });
        expect(getKeywordValue(ranger, 'DEFENDER', withInit)).toBe(1);

        const withoutInit = createGameState({
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        {
                            ...ranger,
                            attachments: [
                                {
                                    ...condition,
                                    instanceId: 'i-will-go-2',
                                },
                            ],
                        },
                    ],
                    hand: [cloneHand('1C119', 'h1')],
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', {
                    hand: [],
                    currentSiteIndex: 3,
                }),
            },
        });
        const rangerNoInit = withoutInit.players['0']!.fellowshipArea[0]!;
        expect(getKeywordValue(rangerNoInit, 'DEFENDER', withoutInit)).toBe(-1);
    });
});

function cloneHand(id: string, instanceId: string) {
    return { ...getCardById(id)!, instanceId };
}
