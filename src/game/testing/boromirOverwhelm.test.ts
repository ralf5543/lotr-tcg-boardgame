import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getWhileOverwhelmFactor } from '../logic/stats/mechanics/whileModifier';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Boromir (1R96) — submersion ×3', () => {
    const text =
        '<keyword>Ranger.</keyword> <br>Boromir is not overwhelmed unless his strength is tripled.';

    it('parse : WHILE → SET_OVERWHELM_FACTOR ×3', () => {
        expect(parseAbilities(text, 'Boromir', '1R96')?.[0]).toMatchObject({
            trigger: { type: 'WHILE' },
            effects: [
                {
                    type: 'SET_OVERWHELM_FACTOR',
                    factor: 3,
                    target: 'SELF',
                },
            ],
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('1R96')!;
        expect(card.keywords).toEqual(expect.arrayContaining(['RANGER']));
        expect(card.abilities?.[0]).toMatchObject({
            trigger: { type: 'WHILE' },
            effects: [
                {
                    type: 'SET_OVERWHELM_FACTOR',
                    factor: 3,
                    target: 'SELF',
                },
            ],
        });
    });

    it('getWhileOverwhelmFactor → 3', () => {
        const boromir = {
            ...getCardById('1R96')!,
            instanceId: 'boromir',
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );
        const G = createGameState({
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [boromir],
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
        });
        expect(getWhileOverwhelmFactor(G, boromir)).toBe(3);
    });
});
