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

    it('Fumeurs : déséquilibre FP/Ombre signalé', () => {
        const result = validateDeck({
            ...(fumeurs as DeckConfig),
            id: 'test-fumeurs',
        });
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.code === 'BALANCE')).toBe(true);
    });

    it('plafond communauté de départ (réductions SF)', () => {
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

    it('seeds exposent les deux decks témoins', () => {
        const seeds = getSeedDecks();
        expect(seeds).toHaveLength(2);
        expect(seeds[0]?.ringBearerId).toBeTruthy();
        expect(seeds[1]?.siteIds).toHaveLength(9);
    });
});
