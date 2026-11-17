import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import { getTwilightCostWithToil } from '../logic/toil';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Halbarad jouable', () => {
    it('carte convertie 14R9 a le passif de coût', () => {
        const card = getCardById('14R9')!;
        expect(card.abilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        ringBearerMinResistance: 9,
                    },
                }),
            ])
        );
    });

    it('playCard depuis la main : pose + crépuscule 2 (Porteur résist. 10)', () => {
        const ring = { ...getCardById('4R1')!, instanceId: 'ring' };
        const frodo = createCompanion({
            id: '11S164',
            instanceId: 'frodo',
            title: 'Frodo',
            culture: 'SHIRE',
            resistance: 10,
            keywords: ['RING-BOUND', 'RING-BEARER'],
            canBeRingbearer: true,
            attachments: [ring],
        });
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            title: 'Ranger of Osgiliath',
        };
        const halbarad = {
            ...getCardById('14R9')!,
            instanceId: 'halbarad',
            title: 'Halbarad',
        };
        const site = createSite({ id: 's1', siteNumber: 1 });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                currentSiteIndex: 0,
                path: [site, null, null, null, null, null, null, null, null],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, ranger],
                        hand: [halbarad],
                        burdens: 0,
                        currentSiteIndex: 0,
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        const G0 = engine.getG();
        const handCard = G0.players['0']!.hand[0]!;
        expect(getTwilightCostWithToil(G0, handCard, 0)).toBe(2);
        expect(
            canPlayCard(
                handCard,
                {
                    G: G0,
                    ctx: { phase: 'fellowship', currentPlayer: '0' },
                    playerID: '0',
                },
                'fellowshipArea'
            )
        ).toEqual({ valid: true });

        engine.moves.playCard(0);

        const G1 = engine.getG();
        expect(G1.players['0']!.hand).toHaveLength(0);
        expect(
            G1.players['0']!.fellowshipArea.some((c) => c.id === '14R9')
        ).toBe(true);
        expect(G1.twilightPool).toBe(2);
    });
});
