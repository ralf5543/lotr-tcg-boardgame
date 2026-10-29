import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { tryOpenWinsSkirmish } from '../engine/responseWindow';
import type { CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'Bearer must be Lurtz.  <br>He is <keyword>Damage +1.</keyword> Each time Lurtz wins a skirmish, the Free Peoples player must discard the top 2 cards of his or her draw deck.';

describe("Lurtz's Sword 2R43 — moulin pioche FP", () => {
    it('analyse CSV : victoire Lurtz → DISCARD_TOP_OF_DECK ×2 FP', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, "Lurtz's Sword", '2R43') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'WINS_SKIRMISH',
                        winner: 'BEARER',
                    },
                    effects: [
                        {
                            type: 'DISCARD_TOP_OF_DECK',
                            count: 2,
                            whose: 'FREE_PEOPLES',
                        },
                    ],
                    source: 'ATTACHMENT',
                }),
            ])
        );
        expect(
            getCardById('2R43')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) => e.type === 'DISCARD_TOP_OF_DECK' && e.count === 2
                )
            )
        ).toBe(true);
    });

    it('Uruk Rager : même famille, this minion', () => {
        expect(
            parseAbilities(
                '<keyword>Damage +1.</keyword>. Each time this minion wins a skirmish, the Free Peoples player must discard the top 2 cards of his or her draw deck.',
                'Uruk Rager',
                '1C150'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
                    effects: [
                        {
                            type: 'DISCARD_TOP_OF_DECK',
                            count: 2,
                            whose: 'FREE_PEOPLES',
                        },
                    ],
                    source: 'SELF',
                }),
            ])
        );
    });

    it('après victoire : 2 cartes du dessus de la pioche FP en défausse', () => {
        const sword = {
            ...getCardById('2R43')!,
            instanceId: 'sword',
        } as CardState;
        const lurtz = createMinion({
            id: 'lurtz',
            title: 'Lurtz',
            strength: 13,
            vitality: 3,
            attachments: [sword],
        });
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
        });
        const mill1 = { id: 'mill1', instanceId: 'mill1' } as CardState;
        const mill2 = { id: 'mill2', instanceId: 'mill2' } as CardState;
        const mill3 = { id: 'mill3', instanceId: 'mill3' } as CardState;
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    deck: [mill1, mill2, mill3],
                    discard: [],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [lurtz],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'frodo',
                    minionIds: ['lurtz'],
                },
            ],
            activeSkirmishId: 'sk-1',
            pendingWinsSkirmish: {
                winnerIds: ['lurtz'],
                skirmishId: 'sk-1',
            },
        });
        expect(tryOpenWinsSkirmish(G)).toBe('APPLIED');
        expect(G.players['0']!.deck.map((c) => c.id)).toEqual(['mill3']);
        expect(G.players['0']!.discard.map((c) => c.id)).toEqual([
            'mill1',
            'mill2',
        ]);
    });

});
