import { describe, expect, it } from 'vitest';
import { parseStartingFellowshipTwilightReduce } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import {
    getStartingFellowshipTwilightCost,
    revealAndPlayStartingFellowships,
} from '../logic/startingFellowship';
import type { CardState } from '../types';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId, isStartingMember: true, isFaceDown: true };
};

describe('Communauté de départ — jouer (hors pool)', () => {
    it('parse : Gandalf / this companion ; refuse and you can spot', () => {
        expect(
            parseStartingFellowshipTwilightReduce(
                'When Gandalf is in your starting fellowship, his twilight cost is -2.',
                'Gandalf'
            )
        ).toBe(2);
        expect(
            parseStartingFellowshipTwilightReduce(
                'When this companion is in your starting fellowship, his twilight cost is -1.',
                'Elite Rider'
            )
        ).toBe(1);
        expect(
            parseStartingFellowshipTwilightReduce(
                'If Faramir is in your starting fellowship, his twilight cost is −1.',
                'Faramir'
            )
        ).toBe(1);
        expect(
            parseStartingFellowshipTwilightReduce(
                'When this is in your starting fellowship and you can spot an unbound gondor companion with cost 3 or more, his twilight cost is -2.',
                'Ranger of the White Tree'
            )
        ).toBeUndefined();
    });

    it('cartes converties : 8R15 −2, Elite Rider −1 (limite construction)', () => {
        expect(getCardById('8R15')?.startingFellowshipTwilightReduce).toBe(2);
        expect(getCardById('4C265')?.startingFellowshipTwilightReduce).toBe(1);
        // 4 − 2 = 2 pour le plafond de 4, pas pour le pool.
        expect(getStartingFellowshipTwilightCost(getCardById('8R15')!)).toBe(2);
    });

    it('révéler : Porteur non joué ; Sméagol fardeau ; pool inchangé', () => {
        const frodo = {
            ...realCard('5U111', 'frodo'),
            keywords: ['RING-BEARER', 'RING-BOUND'],
            attachments: [realCard('4R1', 'ring')],
        };
        const smeagol = realCard('8R27', 'smeagol');
        const gandalf = realCard('8R15', 'gandalf');
        const merry = realCard('1R302', 'merry');
        const aragorn = realCard('11R54', 'aragorn');

        // Ombre : Sméagol en compagnie (ne doit PAS ajouter de fardeau tant que non FP).
        const shadowSmeagol = realCard('8R27', 'shadow-smeagol');

        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            path: [
                createSite({ id: '11S234', siteNumber: 1 }),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    burdens: 0,
                    fellowshipArea: [frodo, smeagol, gandalf, merry, aragorn],
                }),
                '1': createPlayerState('1', {
                    burdens: 0,
                    fellowshipArea: [
                        {
                            ...realCard('1C290', 'shadow-rb'),
                            keywords: ['RING-BEARER'],
                        },
                        shadowSmeagol,
                    ],
                }),
            },
        });

        revealAndPlayStartingFellowships(G);

        // Coûts (plafond 4) hors pool ; toPlay Sméagol = +1 fardeau.
        expect(G.twilightPool).toBe(0);
        expect(G.players['0']!.burdens).toBe(1);
        expect(G.players['1']!.burdens).toBe(0);
        expect(frodo.isFaceDown).toBe(false);
        expect(gandalf.isFaceDown).toBe(false);
        expect(shadowSmeagol.isFaceDown).toBe(false);
    });

    it('réductions SF : 10 imprimés → 4 effectifs (plafond)', () => {
        const ids = ['10R11', '9R+16', '4C265'] as const;
        const cards = ids.map((id) => getCardById(id)!);
        const printed = cards.reduce(
            (sum, c) => sum + (Number(c.twilightCost) || 0),
            0
        );
        const effective = cards.reduce(
            (sum, c) => sum + getStartingFellowshipTwilightCost(c),
            0
        );
        expect(printed).toBe(10);
        expect(effective).toBe(4);
        expect(getStartingFellowshipTwilightCost(getCardById('15U61')!)).toBe(
            1
        );
    });

});
