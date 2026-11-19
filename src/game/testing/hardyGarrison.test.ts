import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { announceInitiativeIfChanged } from '../logic/initiative';
import {
    acceptPendingWhenPlayed,
    declinePendingWhenPlayed,
} from '../engine/abilities/whenPlayed';
import { createEngineClient } from './createEngineClient';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const TEXT =
    'To play, spot 2 <symbol>gondor</symbol> Men. <br>Each time you lose initiative, you may wound a minion.';

describe('Garnison résistante (10U33)', () => {
    it('parse : perte d’initiative → blesser un séide', () => {
        expect(
            parseAbilities(TEXT, 'Hardy Garrison', '10U33')?.[0]
        ).toMatchObject({
            optional: true,
            trigger: { type: 'LOSE_INITIATIVE' },
            cost: [],
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: [['MINION']],
                },
            ],
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('10U33')!;
        expect(card.toPlay).toEqual([
            {
                spot: [
                    {
                        count: 2,
                        target: [['GONDOR', 'MAN']],
                    },
                ],
            },
        ]);
        expect(card.abilities?.[0]).toMatchObject({
            optional: true,
            trigger: { type: 'LOSE_INITIATIVE' },
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: [['MINION']],
                },
            ],
        });
    });

    it('perte d’initiative → toaster → blesser le séide', () => {
        const garrison = {
            ...getCardById('10U33')!,
            instanceId: 'garrison',
        };
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const minion = {
            ...getCardById('5C76')!,
            instanceId: 'southron',
            minionSiteNumber: 4,
            vitality: 3,
            wounds: 0,
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );
        const G = createGameState({
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                    supportArea: [garrison],
                    // 3 cartes = pas d’initiative FP.
                    hand: [
                        { ...getCardById('1C119')!, instanceId: 'h1' },
                        { ...getCardById('1C106')!, instanceId: 'h2' },
                        { ...getCardById('1C117')!, instanceId: 'h3' },
                    ],
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', {
                    hand: [],
                    currentSiteIndex: 3,
                }),
            },
        });

        announceInitiativeIfChanged(G, true);
        expect(G.pendingWhenPlayed?.sourceInstanceId).toBe('garrison');

        expect(
            acceptPendingWhenPlayed(G, '0', undefined, 'southron')
        ).toBe(true);
        expect(minion.wounds).toBe(1);
        expect(G.pendingWhenPlayed).toBeUndefined();
    });

    it('Passer refuse l’effet', () => {
        const garrison = {
            ...getCardById('10U33')!,
            instanceId: 'garrison',
        };
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const minion = {
            ...getCardById('5C76')!,
            instanceId: 'southron',
            minionSiteNumber: 4,
            vitality: 3,
            wounds: 0,
        };
        const G = createGameState({
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    supportArea: [garrison],
                    hand: [
                        { ...getCardById('1C119')!, instanceId: 'h1' },
                        { ...getCardById('1C106')!, instanceId: 'h2' },
                        { ...getCardById('1C117')!, instanceId: 'h3' },
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        announceInitiativeIfChanged(G, true);
        declinePendingWhenPlayed(G, '0');
        expect(G.pendingWhenPlayed).toBeUndefined();
        expect(minion.wounds || 0).toBe(0);
    });

    it('sans séide blessable : pas de toaster', () => {
        const garrison = {
            ...getCardById('10U33')!,
            instanceId: 'garrison',
        };
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const G = createGameState({
            battlefield: [],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    supportArea: [garrison],
                    hand: [
                        { ...getCardById('1C119')!, instanceId: 'h1' },
                        { ...getCardById('1C106')!, instanceId: 'h2' },
                        { ...getCardById('1C117')!, instanceId: 'h3' },
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        announceInitiativeIfChanged(G, true);
        expect(G.pendingWhenPlayed).toBeUndefined();
    });

    it('attacher J’Irai (4→3) en Compagnie déclenche le toaster', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
            attachments: [{ ...getCardById('4R1')!, instanceId: 'ring' }],
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const garrison = {
            ...getCardById('10U33')!,
            instanceId: 'garrison',
        };
        const iWillGo = {
            ...getCardById('7C105')!,
            instanceId: 'i-will-go',
        };
        const minion = {
            ...getCardById('5C76')!,
            instanceId: 'southron',
            minionSiteNumber: 4,
            vitality: 3,
            wounds: 0,
        };
        const engine = createEngineClient({
            startPhase: 'fellowship',
            G: {
                fpPlayerId: '0',
                currentSiteIndex: 3,
                twilightPool: 0,
                battlefield: [minion],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, ranger],
                        supportArea: [garrison],
                        hand: [
                            iWillGo,
                            { ...getCardById('1C119')!, instanceId: 'h2' },
                            { ...getCardById('1C106')!, instanceId: 'h3' },
                            { ...getCardById('1C117')!, instanceId: 'h4' },
                        ],
                        currentSiteIndex: 3,
                    }),
                    '1': createPlayerState('1', {
                        hand: [],
                        currentSiteIndex: 3,
                    }),
                },
            },
        });

        expect(engine.getG().players['0']!.hand).toHaveLength(4);
        engine.moves.attachCard?.(0, 'ranger');
        const G = engine.getG();
        expect(G.players['0']!.hand).toHaveLength(3);
        expect(G.pendingWhenPlayed?.sourceInstanceId).toBe('garrison');
    });
});
