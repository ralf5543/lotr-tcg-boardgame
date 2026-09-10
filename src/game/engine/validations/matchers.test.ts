import { describe, expect, it } from 'vitest';
import {
    cardMatchesCriterion,
    cardMatchesGroup,
    cardMatchesTarget,
} from './matchers';
import { createCard, createCompanion, createMinion } from '../../testing/createGameState';

describe('cardMatchesCriterion', () => {
    it('matche type, race, culture, mot-clé et titre', () => {
        const gimli = createCompanion({
            id: 'gimli',
            title: 'Gimli',
            race: 'DWARF',
            culture: 'DWARVEN',
            keywords: ['ARCHER'],
        });

        expect(cardMatchesCriterion(gimli, 'COMPANION')).toBe(true);
        expect(cardMatchesCriterion(gimli, 'DWARF')).toBe(true);
        expect(cardMatchesCriterion(gimli, 'DWARVEN')).toBe(true);
        expect(cardMatchesCriterion(gimli, 'ARCHER')).toBe(true);
        expect(cardMatchesCriterion(gimli, 'Gimli')).toBe(true);
        expect(cardMatchesCriterion(gimli, 'ELF')).toBe(false);
        expect(cardMatchesCriterion(gimli, 'MINION')).toBe(false);
    });
});

describe('cardMatchesTarget (DNF)', () => {
    it('exige tous les critères d’un groupe (ET)', () => {
        const unboundHobbit = createCompanion({
            id: 'sam',
            race: 'HOBBIT',
            keywords: ['UNBOUND'],
        });
        const boundHobbit = createCompanion({
            id: 'frodo',
            race: 'HOBBIT',
            keywords: ['RING-BOUND'],
        });

        expect(
            cardMatchesGroup(unboundHobbit, ['UNBOUND', 'HOBBIT'])
        ).toBe(true);
        expect(cardMatchesGroup(boundHobbit, ['UNBOUND', 'HOBBIT'])).toBe(
            false
        );
    });

    it('UNBOUND sans mot-clé : compagnon ni ring-bound ni Porteur', () => {
        const merry = createCompanion({
            id: 'merry',
            race: 'HOBBIT',
        });
        expect(cardMatchesCriterion(merry, 'UNBOUND')).toBe(true);
        expect(cardMatchesGroup(merry, ['UNBOUND', 'HOBBIT'])).toBe(true);
    });

    it('CHARACTER matche compagnon, allié, séide', () => {
        expect(
            cardMatchesCriterion(
                createCompanion({ id: 'aragorn' }),
                'CHARACTER'
            )
        ).toBe(true);
        expect(
            cardMatchesCriterion(createMinion({ id: 'orc' }), 'CHARACTER')
        ).toBe(true);
        expect(
            cardMatchesCriterion(
                createCard({ id: 'event', type: 'EVENT' }),
                'CHARACTER'
            )
        ).toBe(false);
    });

    it('accepte n’importe quel groupe (OU)', () => {
        const dwarf = createCompanion({ id: 'gimli', race: 'DWARF' });
        const orc = createMinion({ id: 'orc', race: 'ORC' });
        const man = createCompanion({ id: 'boromir', race: 'MAN' });

        const dwarfOrElf = [['DWARF'], ['ELF']];
        expect(cardMatchesTarget(dwarf, dwarfOrElf)).toBe(true);
        expect(cardMatchesTarget(orc, dwarfOrElf)).toBe(false);
        expect(cardMatchesTarget(man, dwarfOrElf)).toBe(false);
    });

    it('refuse un target vide', () => {
        expect(cardMatchesTarget(createCard({ id: 'x' }), [])).toBe(false);
        expect(cardMatchesGroup(createCard({ id: 'x' }), [])).toBe(false);
    });
});
