import { describe, expect, it } from 'vitest';
import fumeurs from '../game/decks/fumeurs-gollum-threats.json';
import gondor from '../game/decks/gondor-uruks.json';
import type { DeckConfig } from './types';
import {
    startingCompanionTwilightCost,
    validateDeck,
} from './validateDeck';
import { getCardById } from '../game/cardsData';
import { getSeedDecks } from './deckStorage';

describe('validateDeck', () => {
    it('Gondor / Ourouks : jouable', () => {
        const result = validateDeck({
            ...(gondor as DeckConfig),
            id: 'test-gondor',
        });
        expect(result.errors).toEqual([]);
        expect(result.ok).toBe(true);
    });

    it('Fumeurs : deck jouable (FP = Ombre)', () => {
        const result = validateDeck({
            ...(fumeurs as DeckConfig),
            id: 'test-fumeurs',
        });
        expect(result.errors.filter((e) => e.code === 'BALANCE')).toEqual([]);
        expect(result.ok).toBe(true);
    });

    it('plafond compagnie de départ (réductions SF)', () => {
        const gandalf = getCardById('8R15')!;
        expect(startingCompanionTwilightCost(gandalf)).toBe(2);

        const deck: DeckConfig = {
            id: 'cost-test',
            name: 'Coût',
            ringBearerId: '1C290',
            oneRingId: '4R1',
            // 4+4+3 sans réductions = 11 ; avec SF : Glorfindel 2 + Glorfindel? use high cost
            startingCompanionIds: ['9R+16', '8R15', '4C265'], // 2+2+2 = 6 > 4
            freePeople: [],
            shadow: [],
            siteIds: [],
        };
        const result = validateDeck(deck);
        expect(result.errors.some((e) => e.code === 'STARTING_COST')).toBe(
            true
        );
    });

    it('Halbarad : –1 si Porteur résist. ≥ 9 (compagnie de départ)', () => {
        const frodo = getCardById('11S164')!;
        const frodoLow = getCardById('13R149')!; // résist. 8
        const galadriel = getCardById('9R+14')!; // résist. 3
        const halbarad = getCardById('14R9')!;
        expect(frodo.resistance).toBe(10);
        expect(frodoLow.resistance).toBe(8);
        expect(startingCompanionTwilightCost(halbarad, frodo)).toBe(2);
        expect(startingCompanionTwilightCost(halbarad, frodoLow)).toBe(3);
        expect(startingCompanionTwilightCost(halbarad, galadriel)).toBe(3);
        expect(startingCompanionTwilightCost(halbarad)).toBe(3);

        const base = {
            id: 'rangers-test',
            name: 'Rôdeurs',
            oneRingId: '4R1',
            startingCompanionIds: ['7C116', '14R9'], // 2+2 ou 2+3
            freePeople: Array(30).fill('1C106'),
            shadow: Array(30).fill('4C252'),
            siteIds: [
                '15U187',
                '13U193',
                '15S189',
                '11S237',
                '18U135',
                '11S240',
                '12U194',
                '11S256',
                '13U187',
            ],
        };

        expect(
            validateDeck({
                ...base,
                ringBearerId: '11S164',
            } as DeckConfig).errors.filter((e) => e.code === 'STARTING_COST')
        ).toEqual([]);

        expect(
            validateDeck({
                ...base,
                ringBearerId: '9R+14',
            } as DeckConfig).errors.some((e) => e.code === 'STARTING_COST')
        ).toBe(true);

        // Remettre Frodon résist. 10 → plus d’erreur de coût.
        expect(
            validateDeck({
                ...base,
                ringBearerId: '11S164',
            } as DeckConfig).errors.filter((e) => e.code === 'STARTING_COST')
        ).toEqual([]);
    });

    it('sites : set et crépuscule', () => {
        const deck: DeckConfig = {
            ...(gondor as DeckConfig),
            id: 'sites-test',
            siteIds: [
                '1C84', // pas un site
                '11S241',
                '11S234',
                '11U227',
                '11S228',
                '11U246',
                '11S233',
                '11S263',
                '11S250',
            ],
        };
        const result = validateDeck(deck);
        expect(result.errors.some((e) => e.code === 'SITE_TYPE')).toBe(true);
    });

    it('seeds exposent les cinq decks du repo (prod / repli API)', () => {
        const seeds = getSeedDecks();
        expect(seeds).toHaveLength(5);
        for (const deck of seeds) {
            expect(deck.ringBearerId).toBeTruthy();
            expect(deck.siteIds).toHaveLength(9);
        }
    });
});
