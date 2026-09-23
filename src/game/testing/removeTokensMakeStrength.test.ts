import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import { getCardById } from '../cardsData';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import type { CardState } from '../types';

function clone(
    id: string,
    instanceId: string,
    extra: Partial<CardState> = {}
): CardState {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable: ${id}`);
    return { ...card, instanceId, ...extra };
}

describe('Remove culture tokens → strength (runtime)', () => {
    it('Glóin : retire 1 dwarven (autre carte) et +2 force', () => {
        const gloin = clone('15R6', 'dev-gloin');
        const seed = clone('4U57', 'dev-token-seed', {
            cultureTokens: { DWARVEN: 1 },
        });
        const skirmishId = 'sk1';

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                fpPlayerId: '0',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gloin],
                        supportArea: [seed],
                    }),
                    '1': createPlayerState('1', {}),
                },
                skirmishes: [
                    {
                        id: skirmishId,
                        companionId: 'dev-gloin',
                        minionIds: [],
                        resolved: false,
                    },
                ],
                ...createSkirmishActionWindow(skirmishId, '0'),
            },
        });

        const before = getCalculatedStrength(
            engine.getG(),
            engine.getG().players['0']!.fellowshipArea[0]
        );
        engine.moves.activateAbility('dev-gloin', '15R6:0');

        const G = engine.getG();
        const after = G.players['0']!.fellowshipArea[0]!;
        expect(getCalculatedStrength(G, after)).toBe(before + 2);
        expect(G.players['0']!.supportArea[0]!.cultureTokens?.DWARVEN || 0).toBe(
            0
        );
    });

    it('Sudden Fury : retire from here + désignation compagnon shire', () => {
        const frodo = clone('2C102', 'dev-frodo', {
            keywords: ['RING-BEARER', 'RING-BOUND'],
        });
        const fury = clone('12U132', 'dev-fury', {
            cultureTokens: { SHIRE: 1 },
        });
        const skirmishId = 'sk1';

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                fpPlayerId: '0',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo],
                        supportArea: [fury],
                    }),
                    '1': createPlayerState('1', {}),
                },
                skirmishes: [
                    {
                        id: skirmishId,
                        companionId: 'dev-frodo',
                        minionIds: [],
                        resolved: false,
                    },
                ],
                ...createSkirmishActionWindow(skirmishId, '0'),
            },
        });

        const before = getCalculatedStrength(
            engine.getG(),
            engine.getG().players['0']!.fellowshipArea[0]
        );
        engine.moves.activateAbility('dev-fury', '12U132:0', 'dev-frodo');

        const G = engine.getG();
        expect(
            getCalculatedStrength(G, G.players['0']!.fellowshipArea[0]!)
        ).toBe(before + 1);
        expect(G.players['0']!.supportArea[0]!.cultureTokens?.SHIRE || 0).toBe(
            0
        );
    });
});
