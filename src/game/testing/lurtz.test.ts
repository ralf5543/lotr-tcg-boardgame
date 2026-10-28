import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import type { CardState } from '../types';
import { getEffectiveStrength } from '../../utils/cardStats';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Archer.</keyword> <keyword>Damage +1.</keyword> <keyword>Muster.</keyword> (At the start of the regroup phase, you may discard a card from hand to draw a card.) Lurtz is strength +3 for each exhausted companion you can spot.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

describe('Lurtz 11R194 — +3 force par compagnon épuisé', () => {
    it('analyse CSV malgré le rappel Muster entre parenthèses', () => {
        const fromCsv = parseAbilities(CSV_TEXT, 'Lurtz', '11R194') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE' },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 3,
                            target: 'SELF',
                            perSpot: {
                                target: [['EXHAUSTED', 'COMPANION']],
                            },
                        }),
                    ],
                }),
            ])
        );
        expect(
            getCardById('11R194')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) =>
                        e.type === 'MODIFY_STAT' &&
                        e.perSpot &&
                        e.value === 3
                )
            )
        ).toBe(true);
    });

    it('force +3 par compagnon épuisé repérable', () => {
        const lurtz = realCard('11R194', 'lurtz');
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            vitality: 4,
            wounds: 0,
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            vitality: 4,
            wounds: 3, // épuisé
        });
        const sam = createCompanion({
            id: 'sam',
            title: 'Sam',
            vitality: 4,
            wounds: 1, // pas épuisé
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, aragorn, sam],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [lurtz],
        });
        expect(getEffectiveStrength(lurtz, G)).toBe(16);

        aragorn.wounds = 0;
        expect(getEffectiveStrength(lurtz, G)).toBe(13);

        frodo.wounds = 3;
        sam.wounds = 3;
        expect(getEffectiveStrength(lurtz, G)).toBe(19);
    });

});
