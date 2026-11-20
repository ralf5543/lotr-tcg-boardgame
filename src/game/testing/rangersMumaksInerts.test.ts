import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityMatchesTrigger,
    tryOpenWinsSkirmish,
} from '../engine/responseWindow';
import { applyStartOfSkirmishTriggers } from '../engine/abilities/startOfSkirmish';
import { acceptPendingWhenPlayed } from '../engine/abilities/whenPlayed';
import { canUseAbility } from '../engine/canUseAbility';
import { areThreatRemovalsForbiddenForFpCard } from '../logic/threatRestrictions';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('Rôdeurs / Mûmaks — 4 inertes (7R95 / 18U58 / 10U47 / 7R152)', () => {
    it('7R95 Gondor Still Stands : début regroupement + place fortif. sur pioche', () => {
        const card = getCardById('7R95')!;
        expect(card.abilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['START_OF_REGROUP'],
                    requiresNoOpponentControlsSite: true,
                    limitPerPhase: 1,
                    effects: [
                        {
                            type: 'WOUND',
                            count: 1,
                            target: [['MINION']],
                        },
                    ],
                }),
                expect.objectContaining({
                    phases: ['REGROUP'],
                    effects: [
                        {
                            type: 'PLACE_FROM_DISCARD_ON_DECK',
                            position: 'TOP',
                            target: [['GONDOR', 'FORTIFICATION']],
                        },
                    ],
                }),
            ])
        );

        const stands = { ...card, instanceId: 'stands' };
        const fort = {
            ...getCardById('7C118')!,
            instanceId: 'fort',
        };
        const minion = createMinion({
            id: 'm1',
            instanceId: 'm1',
            vitality: 3,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    supportArea: [stands],
                    discard: [fort],
                    deck: [],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [minion],
        });

        const placeAb = card.abilities!.find((a) =>
            a.phases?.includes('REGROUP')
        )!;
        expect(
            applyAbilityEffect(G, stands, placeAb, fort.instanceId)
        ).toBe(true);
        expect(G.players['0']!.deck[0]?.instanceId).toBe('fort');

        expect(
            canUseAbility(stands, {
                G,
                ctx: { phase: 'startOfRegroup' },
                playerID: '0',
            }).valid
        ).toBe(true);

        // Fenêtre d’escarmouche qui traîne : ne doit plus bloquer le dual-wait.
        G.actionWindow = {
            isOpen: true,
            activePlayerId: '1',
            title: 'ESCARMOUCHE',
            message: '…',
            canPass: true,
            passesCount: 0,
        };
        expect(
            canUseAbility(stands, {
                G,
                ctx: { phase: 'startOfRegroup' },
                playerID: '0',
            }).valid
        ).toBe(true);
    });

    it('18U58 Soldier’s Cache : début manœuvre transfert+blessure + reinforce', () => {
        const card = getCardById('18U58')!;
        expect(card.keywords).toContain('FORTIFICATION');
        expect(card.abilities).toHaveLength(3);
        const spotTransfer = card.abilities!.find(
            (a) =>
                a.phases?.includes('START_OF_MANEUVER') &&
                a.cost?.[0]?.spot
        )!;
        const reinforce = card.abilities!.find((a) =>
            a.phases?.includes('REGROUP')
        )!;
        expect(spotTransfer.effects).toEqual([
            {
                type: 'TRANSFER_SELF',
                from: ['SUPPORT'],
                attachTo: 'TARGET',
                attachTarget: [['MINION']],
            },
            { type: 'WOUND', count: 1, target: [['MINION']] },
        ]);
        expect(reinforce.effects).toEqual([
            {
                type: 'REINFORCE_CULTURE_TOKEN',
                culture: 'GONDOR',
                count: 1,
            },
        ]);

        const cache = { ...card, instanceId: 'cache' };
        const rangers = [1, 2, 3].map((n) =>
            createCompanion({
                id: `r${n}`,
                instanceId: `r${n}`,
                culture: 'GONDOR',
                race: 'MAN',
                keywords: ['RANGER'],
            })
        );
        const minion = createMinion({
            id: 'm1',
            instanceId: 'm1',
            vitality: 4,
            wounds: 0,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: rangers,
                    supportArea: [cache],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [minion],
        });

        expect(
            canUseAbility(cache, {
                G,
                ctx: { phase: 'startOfManeuver' },
                playerID: '0',
            }).valid
        ).toBe(true);

        expect(applyAbilityEffect(G, cache, spotTransfer, 'm1')).toBe(true);
        expect(
            G.players['0']!.supportArea.some((c) => c?.instanceId === 'cache')
        ).toBe(false);
        expect(
            minion.attachments?.some((a) => a.instanceId === 'cache')
        ).toBe(true);
        expect(minion.wounds).toBe(1);
    });

    it('10U47 Rallying Call : interdit retrait menaces FP + Ombre joue Suderon', () => {
        const card = getCardById('10U47')!;
        expect(card.abilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE' },
                    effects: [
                        {
                            type: 'FORBID_REMOVE_THREATS',
                            by: 'FREE_PEOPLE_CARDS',
                        },
                    ],
                }),
                expect.objectContaining({
                    phases: ['SHADOW'],
                    cost: [{ removeTwilight: 1 }],
                    effects: [
                        {
                            type: 'PLAY_FROM_HAND',
                            target: [['SOUTHRON']],
                        },
                        { type: 'ADD_THREATS', count: 1 },
                    ],
                }),
            ])
        );

        const call = { ...card, instanceId: 'call' };
        const fpEvent = createCompanion({
            id: 'fp-event',
            instanceId: 'fp-event',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { threats: 3 }),
                '1': createPlayerState('1', {
                    supportArea: [call],
                }),
            },
        });
        expect(areThreatRemovalsForbiddenForFpCard(G, fpEvent)).toBe(true);
        expect(
            areThreatRemovalsForbiddenForFpCard(G, {
                ...call,
                kind: 'SHADOW',
            })
        ).toBe(false);
    });

    it('7R152 Mûmak Commander : 6 menaces + gagne combat → tue auto (pas de toaster)', () => {
        const card = getCardById('7R152')!;
        const killAb = card.abilities![0]!;
        expect(killAb).toMatchObject({
            phases: ['RESPONSE'],
            optional: false,
            trigger: {
                type: 'WINS_SKIRMISH',
                winner: 'SELF',
                spotThreats: 6,
            },
            effects: [{ type: 'KILL', target: 'SKIRMISHING' }],
        });

        const commander = {
            ...card,
            instanceId: 'mumak',
        };
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn',
            strength: 9,
            vitality: 4,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [aragorn],
                    threats: 6,
                    deadPile: [],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [commander],
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'aragorn',
                    minionIds: ['mumak'],
                    resolved: true,
                },
            ],
            activeSkirmishId: 'sk1',
            pendingWinsSkirmish: {
                winnerIds: ['mumak'],
                skirmishId: 'sk1',
            },
        });

        expect(tryOpenWinsSkirmish(G)).toBe('APPLIED');
        expect(G.responseWindow?.isOpen).not.toBe(true);
        expect(G.pendingEvent).toBeUndefined();
        // Mort marquée pour l’anim — pas encore en pile de mort.
        expect(aragorn.isDead).toBe(true);
        expect(G.pendingDeadCardIds).toContain('aragorn');
        expect(
            G.players['0']!.fellowshipArea.some(
                (c) => c.instanceId === 'aragorn'
            )
        ).toBe(true);

        // Sous 6 menaces : pas de kill.
        const aragorn2 = createCompanion({
            id: 'aragorn2',
            instanceId: 'aragorn2',
            strength: 9,
            vitality: 4,
        });
        const G2 = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [aragorn2],
                    threats: 5,
                    deadPile: [],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [{ ...commander, instanceId: 'mumak2' }],
            skirmishes: [
                {
                    id: 'sk2',
                    companionId: 'aragorn2',
                    minionIds: ['mumak2'],
                    resolved: true,
                },
            ],
            activeSkirmishId: 'sk2',
            pendingWinsSkirmish: {
                winnerIds: ['mumak2'],
                skirmishId: 'sk2',
            },
        });
        expect(tryOpenWinsSkirmish(G2)).toBe('APPLIED');
        expect(G2.players['0']!.deadPile).toHaveLength(0);
        expect(
            abilityMatchesTrigger(
                killAb,
                {
                    type: 'WINS_SKIRMISH',
                    winnerIds: ['mumak2'],
                    skirmishId: 'sk2',
                },
                { ...commander, instanceId: 'mumak2' },
                G2
            )
        ).toBe(false);
    });

    it('4C222 Guerrier du désert : début combat → −3 crépuscule → blesser', () => {
        const card = getCardById('4C222')!;
        expect(card.abilities?.[0]).toMatchObject({
            optional: true,
            trigger: { type: 'START_OF_SKIRMISH', involving: 'SELF' },
            cost: [{ removeTwilight: 3 }],
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: 'SKIRMISHING',
                },
            ],
        });

        const warrior = { ...card, instanceId: 'warrior' };
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn',
            vitality: 4,
            wounds: 0,
        });
        const G = createGameState({
            twilightPool: 5,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [aragorn],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [warrior],
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'aragorn',
                    minionIds: ['warrior'],
                },
            ],
            activeSkirmishId: 'sk1',
        });

        expect(applyStartOfSkirmishTriggers(G, 'sk1')).toBe(true);
        expect(G.pendingWhenPlayed?.abilityId).toBe(card.abilities![0]!.id);
        expect(G.pendingWhenPlayed?.playerId).toBe('1');

        // Activer sans désignation : blessure auto sur le compagnon en face.
        expect(acceptPendingWhenPlayed(G, '1')).toBe(true);
        expect(G.twilightPool).toBe(2);
        expect(aragorn.wounds).toBe(1);
        expect(G.pendingWhenPlayed).toBeUndefined();
    });
});
