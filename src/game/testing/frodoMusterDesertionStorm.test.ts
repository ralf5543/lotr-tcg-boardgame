import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canUseAbility } from '../engine/canUseAbility';
import { resolveSiteMoveAbilities } from '../engine/abilities/siteMove';
import { getEffectiveResistance } from '../../utils/cardStats';
import { getMusterCount } from '../logic/musterHelpers';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import { createEngineClient } from './createEngineClient';

describe('Frodon muster + Désertion + Tempête + fardeaux', () => {
    it('2U48 parse : MOVES_FROM exert chaque compagnon', () => {
        const storm = getCardById('2U48')!;
        expect(storm.abilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'MOVES_FROM' },
                    effects: [
                        expect.objectContaining({
                            type: 'EXERT',
                            all: true,
                            target: [['COMPANION']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('Tempête sur site : départ → affaiblit les compagnons', () => {
        const storm = {
            ...getCardById('2U48')!,
            instanceId: 'storm',
        };
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
        });
        site.attachments = [storm];
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            vitality: 4,
            wounds: 0,
        });
        const sam = createCompanion({
            id: 'sam',
            instanceId: 'sam',
            vitality: 4,
            wounds: 0,
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, sam],
                    currentSiteIndex: 0,
                }),
                '1': createPlayerState('1'),
            },
        });
        resolveSiteMoveAbilities(G, site, 'MOVES_FROM');
        expect(G.players['0']!.fellowshipArea[0]!.wounds).toBe(1);
        expect(G.players['0']!.fellowshipArea[1]!.wounds).toBe(1);
    });

    it('Frodon 11S164 : gain muster recalcule musterState', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
            vitality: 4,
            wounds: 0,
        };
        const ability = frodo.abilities![0]!;
        const engine = createEngineClient({
            startPhase: 'startOfRegroup',
            G: {
                fpPlayerId: '0',
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        // Pas de muster au début
        expect(engine.getG().musterState).toBeUndefined();
        engine.moves.activateAbility?.(frodo.instanceId!, ability.id);
        const G = engine.getG();
        const live = G.players['0']!.fellowshipArea[0]!;
        expect(live.wounds).toBe(1);
        expect(getMusterCount(G, '0')).toBe(1);
        expect(G.musterState?.players['0']?.allowedCount).toBe(1);
        expect(G.regroupStep).toBe('MUSTER_STEP');
    });

    it('Désertion : Ombre peut activer sur compagnon adverse', () => {
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry',
            strength: 5,
            attachments: [
                {
                    ...getCardById('6U61')!,
                    instanceId: 'desertion',
                },
            ],
        });
        const weak = createMinion({
            id: 'weak',
            instanceId: 'weak',
            culture: 'ISENGARD',
            strength: 3,
        });
        const G = createGameState({
            fpPlayerId: '0',
            assignmentStep: 'ACTIONS',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [merry],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [weak],
        });
        const desertion = merry.attachments![0]!;
        const check = canUseAbility(desertion, {
            G,
            ctx: { phase: 'assignment' },
            playerID: '1',
        });
        expect(check.valid).toBe(true);
        // Contrôle par kind Ombre, pas par zone FP du porteur.
        expect(
            canUseAbility(desertion, {
                G,
                ctx: { phase: 'assignment' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });

    it('résistance : tous les compagnons baissent avec les fardeaux', () => {
        const rb = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            resistance: 10,
            keywords: ['RING-BOUND'],
            ringBearer: true,
        });
        const other = createCompanion({
            id: 'boromir',
            instanceId: 'boromir',
            resistance: 6,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 3,
                    fellowshipArea: [rb, other],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getEffectiveResistance(rb, 3, G)).toBe(7);
        expect(getEffectiveResistance(other, 3, G)).toBe(3);
    });
});
