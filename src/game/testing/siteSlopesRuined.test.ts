import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    beginOptionalSitePhaseAbility,
    resolvePendingSitePhaseAbility,
} from '../logic/sitePhaseAbility';
import {
    beginOptionalSiteFollowerTransferAbility,
    resolvePendingSiteFollowerTransferAbility,
} from '../logic/siteFollowerTransferAbility';
import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createFollower,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const SLOPES_TEXT =
    '<keyword>Mountain. Shadow:</keyword> Remove <symbol>twilight2</symbol> and discard 2 Free Peoples cards from hand to draw a card.';

const RUINED_TEXT =
    '<keyword>Battleground.</keyword> Each time a follower is transfered to a character, the first Shadow player may exert a companion twice.';

function slopesSite(): SiteCardState {
    return createSite({
        id: '12U192',
        siteNumber: 2,
        abilities: parseSiteAbilities(
            SLOPES_TEXT,
            '12U192'
        ) as unknown as Ability[],
        ...({
            instanceId: '12U192-inst',
            kind: 'SITE',
            type: 'SITE',
        } as object),
    });
}

function ruinedSite(): SiteCardState {
    return createSite({
        id: '15U192',
        siteNumber: 3,
        abilities: parseSiteAbilities(
            RUINED_TEXT,
            '15U192'
        ) as unknown as Ability[],
        ...({
            instanceId: '15U192-inst',
            kind: 'SITE',
            type: 'SITE',
        } as object),
    });
}

function fpHandCards(n: number): CardState[] {
    return Array.from({ length: n }, (_, i) =>
        createCard({
            id: `fp${i + 1}`,
            kind: 'FREE_PEOPLE',
            title: `FP ${i + 1}`,
        })
    );
}

describe('parseSiteAbilities — Slopes / Ruined', () => {
    it('Slopes : Ombre −2 crépuscule + défausse 2 FP → DRAW', () => {
        const abilities = parseSiteAbilities(SLOPES_TEXT, '12U192');
        expect(abilities).toEqual([
            expect.objectContaining({
                phases: ['SHADOW'],
                optional: true,
                responsePlayer: 'SHADOW',
                cost: [
                    {
                        removeTwilight: 2,
                        discardFromHand: 2,
                        discardFromHandKind: 'FREE_PEOPLE',
                    },
                ],
                effects: [{ type: 'DRAW', count: 1 }],
            }),
        ]);
    });

    it('Ruined : transfert suivant → Ombre may exert compagnon ×2', () => {
        const abilities = parseSiteAbilities(RUINED_TEXT, '15U192');
        expect(abilities).toEqual([
            expect.objectContaining({
                optional: true,
                responsePlayer: 'SHADOW',
                trigger: { type: 'FOLLOWER_TRANSFERRED' },
                effects: [
                    {
                        type: 'EXERT',
                        count: 2,
                        target: [['COMPANION']],
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — Slopes of Orodruin', () => {
    function buildSlopes(overrides?: {
        twilight?: number;
        fpInHand?: number;
        shadowDeck?: number;
    }): GameState {
        const twilight = overrides?.twilight ?? 4;
        const fpInHand = overrides?.fpInHand ?? 2;
        const shadowDeck = overrides?.shadowDeck ?? 1;
        return createGameState({
            twilightPool: twilight,
            path: [slopesSite()],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [createCompanion({ id: 'c1' })],
                }),
                '1': createPlayerState('1', {
                    hand: [
                        ...fpHandCards(fpInHand),
                        createCard({
                            id: 'sh1',
                            kind: 'SHADOW',
                            title: 'Shadow 1',
                        }),
                    ],
                    deck: Array.from({ length: shadowDeck }, (_, i) =>
                        createCard({
                            id: `draw${i + 1}`,
                            kind: 'SHADOW',
                            title: `Draw ${i + 1}`,
                        })
                    ),
                }),
            },
        });
    }

    it('ouvre le toaster si crépuscule + 2 FP en main + pioche', () => {
        const G = buildSlopes();
        expect(beginOptionalSitePhaseAbility(G)).toBe(true);
        expect(G.pendingSitePhaseAbility).toEqual(
            expect.objectContaining({
                playerId: '1',
                siteInstanceId: '12U192-inst',
            })
        );
    });

    it('Activer : −2 crépuscule, défausse 2 FP, pioche Ombre', () => {
        const G = buildSlopes();
        beginOptionalSitePhaseAbility(G);
        expect(
            resolvePendingSitePhaseAbility(G, '1', true, ['fp1', 'fp2'])
        ).toBe(true);
        expect(G.twilightPool).toBe(2);
        expect(G.players['1']?.hand.map((c) => c.id)).toEqual(['sh1', 'draw1']);
        expect(G.players['1']?.discard).toHaveLength(2);
        expect(G.players['1']?.deck).toHaveLength(0);
        expect(G.pendingSitePhaseAbility).toBeUndefined();
        expect(G.sitePhaseAbilityOfferedThisPhase).toBe(true);
    });

    it('refuse Activer avec cartes Ombre (filtre kind)', () => {
        const G = buildSlopes();
        beginOptionalSitePhaseAbility(G);
        expect(
            resolvePendingSitePhaseAbility(G, '1', true, ['fp1', 'sh1'])
        ).toBe(false);
        expect(G.twilightPool).toBe(4);
        expect(G.pendingSitePhaseAbility).toBeDefined();
    });

    it('pas de toaster si crépuscule insuffisant ou < 2 FP', () => {
        expect(beginOptionalSitePhaseAbility(buildSlopes({ twilight: 1 }))).toBe(
            false
        );
        expect(
            beginOptionalSitePhaseAbility(buildSlopes({ fpInHand: 1 }))
        ).toBe(false);
        expect(
            beginOptionalSitePhaseAbility(buildSlopes({ shadowDeck: 0 }))
        ).toBe(false);
    });
});

describe('runtime — Isengard Ruined', () => {
    function buildRuined(): GameState {
        return createGameState({
            path: [ruinedSite()],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({
                            id: 'aragorn',
                            vitality: 4,
                            wounds: 0,
                        }),
                    ],
                    supportArea: [
                        createFollower({
                            id: 'follower-1',
                            aidCost: { type: 'TWILIGHT', amount: 1 },
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
    }

    it('après transfert : toaster Ombre si compagnon exertable ×2', () => {
        const G = buildRuined();
        expect(beginOptionalSiteFollowerTransferAbility(G)).toBe(true);
        expect(G.pendingSiteFollowerTransfer).toEqual(
            expect.objectContaining({
                playerId: '1',
                siteInstanceId: '15U192-inst',
            })
        );
    });

    it('Activer avec cible : exert ×2', () => {
        const G = buildRuined();
        beginOptionalSiteFollowerTransferAbility(G);
        expect(
            resolvePendingSiteFollowerTransferAbility(G, '1', true, 'aragorn')
        ).toBe(true);
        const companion = G.players['0']?.fellowshipArea[0];
        expect(companion?.wounds).toBe(2);
        expect(G.pendingSiteFollowerTransfer).toBeUndefined();
    });

    it('Passer : aucun exert', () => {
        const G = buildRuined();
        beginOptionalSiteFollowerTransferAbility(G);
        expect(
            resolvePendingSiteFollowerTransferAbility(G, '1', false)
        ).toBe(true);
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(0);
        expect(G.pendingSiteFollowerTransfer).toBeUndefined();
    });

    it('moteur : transferAid → resolve ferme le pending (move enregistré)', () => {
        const engine = createEngineClient({
            startPhase: 'startOfManeuver',
            playerID: '0',
            G: {
                path: [ruinedSite()],
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [
                            createCompanion({ id: 'aragorn', vitality: 4 }),
                        ],
                        supportArea: [
                            createFollower({
                                id: 'follower-1',
                                aidCost: { type: 'TWILIGHT', amount: 1 },
                            }),
                        ],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        engine.moves.transferAid('follower-1', 'aragorn');
        expect(engine.getG().pendingSiteFollowerTransfer?.playerId).toBe('1');

        engine.updatePlayerID('1');
        engine.moves.resolveSiteFollowerTransferAbilityChoice(true, 'aragorn');
        expect(engine.getG().pendingSiteFollowerTransfer).toBeUndefined();
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(2);
    });
});
