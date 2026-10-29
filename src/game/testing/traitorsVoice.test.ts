import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { getMoveLimit } from '../logic/moveLimit';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Search.</keyword> To play, spot an Uruk-hai. <br>While the Ring-bearer is exhausted or you can spot 5 burdens, the move limit for this turn is -1 (to a minimum of 1).';

const TRAITORS: Ability = {
    id: '1U142:0',
    phases: [],
    trigger: {
        type: 'WHILE',
        ringBearerExhaustedOrSpotBurdens: 5,
    },
    cost: [],
    effects: [{ type: 'MODIFY_MOVE_LIMIT', value: -1, min: 1 }],
    source: 'SELF',
    text: 'While the Ring-bearer is exhausted or you can spot 5 burdens, the move limit for this turn is -1 (to a minimum of 1).',
};

describe("Voix du Traître 1U142 — limite de déplacement −1", () => {
    it('analyse : WHILE RB épuisé / 5 fardeaux → MODIFY_MOVE_LIMIT', () => {
        expect(parseAbilities(CSV_TEXT, "Traitor's Voice", '1U142')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        ringBearerExhaustedOrSpotBurdens: 5,
                    },
                    effects: [
                        {
                            type: 'MODIFY_MOVE_LIMIT',
                            value: -1,
                            min: 1,
                        },
                    ],
                }),
            ])
        );
        expect(
            getCardById('1U142')?.abilities?.some((ab) =>
                (ab.effects || []).some((e) => e.type === 'MODIFY_MOVE_LIMIT')
            )
        ).toBe(true);
    });

    it('Porteur épuisé → limite 1 ; sinon base 2', () => {
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            vitality: 4,
            wounds: 3,
            keywords: ['RING-BEARER'],
        });
        const voice = createCard({
            id: '1U142',
            instanceId: 'voice',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'ISENGARD',
            abilities: [TRAITORS],
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    burdens: 0,
                }),
                '1': createPlayerState('1', { supportArea: [voice] }),
            },
            battlefield: [
                createMinion({
                    id: 'uruk',
                    instanceId: 'uruk',
                    culture: 'ISENGARD',
                    race: 'URUK-HAI',
                }),
            ],
        });

        expect(getMoveLimit(G)).toBe(1);

        frodo.wounds = 0;
        expect(getMoveLimit(G)).toBe(2);

        G.players['0']!.burdens = 5;
        expect(getMoveLimit(G)).toBe(1);
    });

});
