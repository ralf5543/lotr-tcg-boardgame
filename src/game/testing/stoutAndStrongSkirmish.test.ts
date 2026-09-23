import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import { getCardById } from '../cardsData';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { canUseAbility } from '../engine/canUseAbility';
import {
    abilityHasLegalEffectTarget,
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
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

describe('Stout and Strong (4U57) skirmish', () => {
    it('active +2 force et défausse la situation', () => {
        const gimli = clone('0P12', 'dev-gimli');
        const stout = clone('4U57', 'dev-stout', {
            cultureTokens: { DWARVEN: 2 },
        });
        const minion = clone('11S90', 'dev-bree');
        const skirmishId = 'sk1';

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                fpPlayerId: '0',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli],
                        supportArea: [stout],
                    }),
                    '1': createPlayerState('1', {}),
                },
                battlefield: [minion],
                skirmishes: [
                    {
                        id: skirmishId,
                        companionId: 'dev-gimli',
                        minionIds: ['dev-bree'],
                        resolved: false,
                    },
                ],
                ...createSkirmishActionWindow(skirmishId, '0'),
            },
        });

        const G = engine.getG();
        const source = G.players['0']!.supportArea[0]!;
        const ability = source.abilities!.find((a) => a.id === '4U57:0')!;
        expect(ability).toBeTruthy();
        expect(ability.effects[0]).toMatchObject({
            type: 'ADD_TEMP_STAT',
            perCultureTokensOnSelf: { culture: 'DWARVEN', limit: 3 },
        });

        const ctx = { G, ctx: engine.getCtx(), playerID: '0' };
        expect(canUseAbility(source, ctx).valid).toBe(true);
        expect(abilityHasLegalEffectTarget(G, source, ability)).toBe(true);
        expect(abilityNeedsEffectDesignation(G, source, ability)).toBe(true);
        expect(
            getEffectDesignationCandidates(G, source, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['dev-gimli']);

        const before = getCalculatedStrength(
            G,
            G.players['0']!.fellowshipArea[0]
        );
        engine.moves.activateAbility('dev-stout', '4U57:0', 'dev-gimli');

        const G2 = engine.getG();
        expect(
            G2.players['0']!.supportArea.find((c) => c.id === '4U57')
        ).toBeUndefined();
        expect(G2.players['0']!.discard.some((c) => c.id === '4U57')).toBe(
            true
        );
        const gimli2 = G2.players['0']!.fellowshipArea[0]!;
        expect(getCalculatedStrength(G2, gimli2)).toBe(before + 2);
        expect(
            G2.tempModifiers?.some(
                (m) => m.targetCardId === 'dev-gimli' && m.value === 2
            )
        ).toBe(true);
    });

    it('refuse sans jeton nain', () => {
        const gimli = clone('0P12', 'dev-gimli');
        const stout = clone('4U57', 'dev-stout', { cultureTokens: {} });
        const skirmishId = 'sk1';

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                fpPlayerId: '0',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli],
                        supportArea: [stout],
                    }),
                    '1': createPlayerState('1', {}),
                },
                skirmishes: [
                    {
                        id: skirmishId,
                        companionId: 'dev-gimli',
                        minionIds: [],
                        resolved: false,
                    },
                ],
                ...createSkirmishActionWindow(skirmishId, '0'),
            },
        });

        const G = engine.getG();
        const source = G.players['0']!.supportArea[0]!;
        const ability = source.abilities!.find((a) => a.id === '4U57:0')!;
        expect(abilityHasLegalEffectTarget(G, source, ability)).toBe(false);
        expect(
            canUseAbility(source, {
                G,
                ctx: engine.getCtx(),
                playerID: '0',
            }).valid
        ).toBe(false);
    });
});
