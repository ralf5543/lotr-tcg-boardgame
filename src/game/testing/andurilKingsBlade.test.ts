import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Andúril, Lame de Roi (7R80)', () => {
    const text =
        'Bearer must be Aragorn. <br>If you cannot spot a threat, Aragorn is defender +1.';

    it('parse : WHILE 0 menace → DEFENDER +1 sur Aragorn (BEARER)', () => {
        expect(
            parseAbilities(text, "Andúril", '7R80')?.[0]
        ).toMatchObject({
            trigger: { type: 'WHILE', cannotSpotThreats: 1 },
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

    it('cartes.json : ability + FR corrigé', () => {
        const card = getCardById('7R80')!;
        expect(card.i18n?.fr?.title).toBe('Andúril');
        expect(card.i18n?.fr?.gameText).toMatch(/défenseur \+1/i);
        expect(card.abilities?.[0]).toMatchObject({
            trigger: { type: 'WHILE', cannotSpotThreats: 1 },
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: 'DEFENDER +1',
                    target: 'BEARER',
                },
            ],
        });
    });

    it('0 menace → DEFENDER +1 ; ≥1 menace → rien', () => {
        const anduril = {
            ...getCardById('7R80')!,
            instanceId: 'anduril',
        };
        const aragorn = {
            ...getCardById('1P365')!,
            instanceId: 'aragorn',
            attachments: [anduril],
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );

        const noThreat = createGameState({
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [aragorn],
                    threats: 0,
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
        });
        expect(getKeywordValue(aragorn, 'DEFENDER', noThreat)).toBe(1);

        const withThreat = createGameState({
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        {
                            ...aragorn,
                            attachments: [
                                { ...anduril, instanceId: 'anduril-2' },
                            ],
                        },
                    ],
                    threats: 1,
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
        });
        const aragornThreat = withThreat.players['0']!.fellowshipArea[0]!;
        expect(getKeywordValue(aragornThreat, 'DEFENDER', withThreat)).toBe(-1);
    });
});
