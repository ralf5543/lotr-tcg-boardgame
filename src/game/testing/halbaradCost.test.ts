import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getTwilightCostWithToil } from '../logic/toil';
import { getWhileTwilightCostModifier } from '../logic/stats/mechanics/whileModifier';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Halbarad — coût crépuscule / résistance Porteur', () => {
    it('parse : WHILE ringBearerMinResistance + TWILIGHT_COST SELF –1', () => {
        const text =
            getCardById('14R9')?.i18n?.en?.gameText ||
            'While the Ring-bearer has resistance 9 or more, Halbarad’s twilight cost is –1.';
        const abs = parseAbilities(text, 'Halbarad', '14R9') || [];
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        ringBearerMinResistance: 9,
                    },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            stat: 'TWILIGHT_COST',
                            value: -1,
                            target: 'SELF',
                        }),
                    ],
                }),
            ])
        );
    });

    it('Frodon résist. 10, 0 fardeau → coût Halbarad 2 ; 2 fardeaux → 3', () => {
        const ring = {
            ...getCardById('4R1')!,
            instanceId: 'ring',
        };
        const frodo = createCompanion({
            id: '11S164',
            instanceId: 'frodo',
            title: 'Frodo',
            culture: 'SHIRE',
            race: 'HOBBIT',
            resistance: 10,
            keywords: ['RING-BOUND'],
            canBeRingbearer: true,
            attachments: [ring],
        });

        const halbarad = {
            ...getCardById('14R9')!,
            instanceId: 'halbarad-hand',
        };

        const site = createSite({ id: 's1', siteNumber: 1 });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    hand: [halbarad],
                    burdens: 0,
                    currentSiteIndex: 0,
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(getWhileTwilightCostModifier(G, halbarad)).toBe(-1);
        expect(getTwilightCostWithToil(G, halbarad, 0)).toBe(2);

        G.players['0']!.burdens = 2;
        expect(getWhileTwilightCostModifier(G, halbarad)).toBe(0);
        expect(getTwilightCostWithToil(G, halbarad, 0)).toBe(3);
    });
});
