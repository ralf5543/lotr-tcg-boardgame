import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { advanceCompany } from '../moves/fellowshipMoves';
import {
    beginOptionalSiteMoveAbility,
    resolvePendingSiteMoveAbility,
} from '../logic/siteMoveAbility';
import {
    assignSiteCharacterWound,
    beginSiteMoveCharacterWoundsIfNeeded,
} from '../logic/siteMoveCharacterWounds';
import { tokenCountOnCard } from '../logic/cultureTokens';
import type { Ability, GameState, SiteCardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const DOORWAY_TEXT =
    '**Mountain.** When the fellowship moves to this site, each player wounds two of his or her characters.';
const CROSSROADS_TEXT =
    '**Forest.** When the fellowship moves to this site during the regroup phase, the Free Peoples player may heal a companion of each culture.';
const MORANNON_TEXT =
    '**Battleground. Plains.** When the fellowship moves to this site, each player may reinforce a culture token.';

function doorwaySite(): SiteCardState {
    return createSite({
        id: '18U134',
        siteNumber: 2,
        abilities: parseSiteAbilities(
            DOORWAY_TEXT,
            '18U134'
        ) as unknown as Ability[],
        ...({
            instanceId: '18U134-inst',
            kind: 'SITE',
            type: 'SITE',
        } as object),
    });
}

function crossroadsSite(): SiteCardState {
    return createSite({
        id: '13S189',
        siteNumber: 3,
        abilities: parseSiteAbilities(
            CROSSROADS_TEXT,
            '13S189'
        ) as unknown as Ability[],
        ...({
            instanceId: '13S189-inst',
            kind: 'SITE',
            type: 'SITE',
        } as object),
    });
}

function morannonSite(): SiteCardState {
    return createSite({
        id: '18U137',
        siteNumber: 2,
        abilities: parseSiteAbilities(
            MORANNON_TEXT,
            '18U137'
        ) as unknown as Ability[],
        ...({
            instanceId: '18U137-inst',
            kind: 'SITE',
            type: 'SITE',
        } as object),
    });
}

describe('parseSiteAbilities — Doorway / Crossroads / Morannon', () => {
    it('Doorway : eachOwner WOUND ×2', () => {
        expect(parseSiteAbilities(DOORWAY_TEXT, '18U134')).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO' },
                effects: [
                    {
                        type: 'WOUND',
                        count: 2,
                        eachOwner: true,
                        target: [['CHARACTER']],
                    },
                ],
            }),
        ]);
    });

    it('Crossroads : regroup → may heal onePerCulture', () => {
        expect(parseSiteAbilities(CROSSROADS_TEXT, '13S189')).toEqual([
            expect.objectContaining({
                optional: true,
                responsePlayer: 'FREE_PEOPLE',
                trigger: { type: 'MOVES_TO', duringRegroup: true },
                effects: [
                    {
                        type: 'HEAL',
                        count: 1,
                        onePerCulture: true,
                        target: [['COMPANION']],
                    },
                ],
            }),
        ]);
    });

    it('Morannon : eachPlayerMay reinforce', () => {
        expect(parseSiteAbilities(MORANNON_TEXT, '18U137')).toEqual([
            expect.objectContaining({
                optional: true,
                eachPlayerMay: true,
                trigger: { type: 'MOVES_TO' },
                effects: [
                    {
                        type: 'REINFORCE_CULTURE_TOKEN',
                        culture: 'ANY',
                        count: 1,
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — Doorway to Doom', () => {
    it('ouvre pendingSiteCharacterWounds FP puis Ombre', () => {
        const G = createGameState({
            path: [
                createSite({ id: 'from', siteNumber: 1 }),
                doorwaySite(),
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
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({ id: 'c1', instanceId: 'c1' }),
                        createCompanion({ id: 'c2', instanceId: 'c2' }),
                        createCompanion({ id: 'c3', instanceId: 'c3' }),
                    ],
                }),
                '1': createPlayerState('1', {}),
            },
            battlefield: [
                createMinion({ id: 'm1', instanceId: 'm1' }),
                createMinion({ id: 'm2', instanceId: 'm2' }),
            ],
        });

        advanceCompany(G);
        expect(beginSiteMoveCharacterWoundsIfNeeded(G, 'startOfShadow')).toBe(
            true
        );
        expect(G.pendingSiteCharacterWounds).toEqual(
            expect.objectContaining({
                playerId: '0',
                remaining: 2,
                queue: ['1'],
            })
        );

        expect(assignSiteCharacterWound(G, '0', 'c1')).toBe(true);
        expect(G.players['0']?.fellowshipArea?.find((c) => c.id === 'c1')?.wounds).toBe(
            1
        );
        expect(G.pendingSiteCharacterWounds?.remaining).toBe(1);

        expect(assignSiteCharacterWound(G, '0', 'c2')).toBe(true);
        expect(G.pendingSiteCharacterWounds).toEqual(
            expect.objectContaining({
                playerId: '1',
                remaining: 2,
            })
        );

        expect(assignSiteCharacterWound(G, '1', 'm1')).toBe(true);
        expect(assignSiteCharacterWound(G, '1', 'm2')).toBe(true);
        expect(G.pendingSiteCharacterWounds).toBeUndefined();
    });
});

describe('runtime — Crossroads', () => {
    it('hors regroupement : pas d’offre', () => {
        const G = createGameState({
            path: [
                createSite({ id: 'from', siteNumber: 1 }),
                crossroadsSite(),
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
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({
                            id: 'c1',
                            culture: 'SHIRE',
                            wounds: 1,
                        }),
                    ],
                }),
                '1': createPlayerState('1', {}),
            },
        });
        advanceCompany(G);
        expect(beginOptionalSiteMoveAbility(G, 'startOfShadow')).toBe(false);
    });

    it('en regroupement : toaster puis heal onePerCulture', () => {
        const abilities = parseSiteAbilities(
            CROSSROADS_TEXT,
            '13S189'
        ) as unknown as Ability[];
        const G = createGameState({
            regroupStep: 'FP_DECISION',
            path: [
                createSite({ id: 'from', siteNumber: 1 }),
                createSite({
                    id: '13S189',
                    siteNumber: 2,
                    abilities,
                    ...({
                        instanceId: '13S189-inst',
                        kind: 'SITE',
                        type: 'SITE',
                    } as object),
                }),
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
                    currentSiteIndex: 1,
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            culture: 'SHIRE',
                            wounds: 1,
                        }),
                        createCompanion({
                            id: 'sam',
                            culture: 'SHIRE',
                            wounds: 1,
                        }),
                        createCompanion({
                            id: 'gimli',
                            culture: 'DWARVEN',
                            wounds: 1,
                        }),
                    ],
                }),
                '1': createPlayerState('1', {}),
            },
        });

        expect(beginOptionalSiteMoveAbility(G, 'startOfShadow')).toBe(true);
        // Sam + Gimli (pas Frodo) : choix explicite par culture.
        expect(
            resolvePendingSiteMoveAbility(G, '0', true, undefined, undefined, [
                'sam',
                'gimli',
            ])
        ).toBe(true);

        const area = G.players['0']?.fellowshipArea || [];
        expect(area.find((c) => c.id === 'frodo')?.wounds).toBe(1);
        expect(area.find((c) => c.id === 'sam')?.wounds).toBe(0);
        expect(area.find((c) => c.id === 'gimli')?.wounds).toBe(0);
    });

    it('refuse deux compagnons de la même culture', () => {
        const abilities = parseSiteAbilities(
            CROSSROADS_TEXT,
            '13S189'
        ) as unknown as Ability[];
        const G = createGameState({
            regroupStep: 'FP_DECISION',
            path: [
                createSite({ id: 'from', siteNumber: 1 }),
                createSite({
                    id: '13S189',
                    siteNumber: 2,
                    abilities,
                    ...({
                        instanceId: '13S189-inst',
                        kind: 'SITE',
                        type: 'SITE',
                    } as object),
                }),
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
                    currentSiteIndex: 1,
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            culture: 'SHIRE',
                            wounds: 1,
                        }),
                        createCompanion({
                            id: 'sam',
                            culture: 'SHIRE',
                            wounds: 1,
                        }),
                        createCompanion({
                            id: 'gimli',
                            culture: 'DWARVEN',
                            wounds: 1,
                        }),
                    ],
                }),
                '1': createPlayerState('1', {}),
            },
        });
        beginOptionalSiteMoveAbility(G, 'startOfShadow');
        expect(
            resolvePendingSiteMoveAbility(G, '0', true, undefined, undefined, [
                'frodo',
                'sam',
            ])
        ).toBe(false);
        expect(G.pendingSiteMoveAbility).toBeDefined();
    });
});

describe('runtime — Morannon Plains', () => {
    it('toaster FP puis Ombre ; reinforce sur la carte désignée', () => {
        const G = createGameState({
            path: [
                createSite({ id: 'from', siteNumber: 1 }),
                morannonSite(),
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
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({
                            id: 'gimli',
                            instanceId: 'gimli',
                            culture: 'DWARVEN',
                            cultureTokens: { DWARVEN: 1 },
                        }),
                    ],
                    supportArea: [
                        createCard({
                            id: 'axe',
                            instanceId: 'axe',
                            kind: 'FREE_PEOPLE',
                            type: 'CONDITION',
                            culture: 'DWARVEN',
                            cultureTokens: { DWARVEN: 1 },
                        }),
                    ],
                }),
                '1': createPlayerState('1', {}),
            },
            battlefield: [
                createMinion({
                    id: 'orc',
                    instanceId: 'orc',
                    culture: 'ORC',
                    cultureTokens: { ORC: 1 },
                }),
            ],
        });

        advanceCompany(G);
        expect(beginOptionalSiteMoveAbility(G, 'startOfShadow')).toBe(true);
        expect(G.pendingSiteMoveAbility?.playerId).toBe('0');

        // Choix : situation, pas Gimli.
        expect(
            resolvePendingSiteMoveAbility(G, '0', true, undefined, undefined, [
                'axe',
            ])
        ).toBe(true);
        expect(
            tokenCountOnCard(G.players['0']!.supportArea![0], 'DWARVEN')
        ).toBe(2);
        expect(
            tokenCountOnCard(G.players['0']!.fellowshipArea![0], 'DWARVEN')
        ).toBe(1);
        expect(G.pendingSiteMoveAbility?.playerId).toBe('1');

        expect(
            resolvePendingSiteMoveAbility(G, '1', true, undefined, undefined, [
                'orc',
            ])
        ).toBe(true);
        expect(tokenCountOnCard(G.battlefield[0], 'ORC')).toBe(2);
        expect(G.pendingSiteMoveAbility).toBeUndefined();
    });

    it('si seul l’Ombre peut reinforce : offre directe Ombre', () => {
        const G = createGameState({
            path: [
                createSite({ id: 'from', siteNumber: 1 }),
                morannonSite(),
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
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({ id: 'c1', culture: 'SHIRE' }),
                    ],
                }),
                '1': createPlayerState('1', {}),
            },
            battlefield: [
                createMinion({
                    id: 'orc',
                    instanceId: 'orc',
                    culture: 'ORC',
                    cultureTokens: { ORC: 1 },
                }),
            ],
        });

        advanceCompany(G);
        expect(beginOptionalSiteMoveAbility(G, 'startOfShadow')).toBe(true);
        expect(G.pendingSiteMoveAbility?.playerId).toBe('1');
    });
});

describe('moteur — Doorway via endFellowshipPhase', () => {
    it('bloque la phase jusqu’à l’assignation', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                path: [
                    createSite({ id: 'from', siteNumber: 1 }),
                    doorwaySite(),
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
                        currentSiteIndex: 0,
                        fellowshipArea: [
                            createCompanion({ id: 'c1', instanceId: 'c1' }),
                            createCompanion({ id: 'c2', instanceId: 'c2' }),
                        ],
                    }),
                    '1': createPlayerState('1', {}),
                },
                battlefield: [
                    createMinion({ id: 'm1', instanceId: 'm1' }),
                    createMinion({ id: 'm2', instanceId: 'm2' }),
                ],
            },
        });

        engine.updatePlayerID('0');
        engine.moves.endFellowshipPhase();
        expect(engine.getG().pendingSiteCharacterWounds?.playerId).toBe('0');
        expect(engine.getCtx().phase).toBe('fellowship');

        engine.moves.assignSiteCharacterWound('c1');
        engine.moves.assignSiteCharacterWound('c2');
        expect(engine.getG().pendingSiteCharacterWounds?.playerId).toBe('1');

        engine.updatePlayerID('1');
        engine.moves.assignSiteCharacterWound('m1');
        engine.moves.assignSiteCharacterWound('m2');
        expect(engine.getG().pendingSiteCharacterWounds).toBeUndefined();
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });
});

describe('applyAbilityEffect — onePerCulture', () => {
    it('soigne les compagnons désignés (1 par culture)', () => {
        const ability = parseSiteAbilities(
            CROSSROADS_TEXT,
            '13S189'
        )![0] as Ability;
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'a',
                            culture: 'GONDOR',
                            wounds: 2,
                        }),
                        createCompanion({
                            id: 'b',
                            culture: 'GONDOR',
                            wounds: 1,
                        }),
                        createCompanion({
                            id: 'c',
                            culture: 'ELVEN',
                            wounds: 1,
                        }),
                    ],
                }),
                '1': createPlayerState('1', {}),
            },
            path: [crossroadsSite(), null, null, null, null, null, null, null, null],
        });
        const site = G.path[0] as SiteCardState;
        expect(
            applyAbilityEffect(G, site as never, ability, ['b', 'c'])
        ).toBe(true);
        const area = G.players['0']!.fellowshipArea!;
        expect(area.find((c) => c.id === 'a')?.wounds).toBe(2);
        expect(area.find((c) => c.id === 'b')?.wounds).toBe(0);
        expect(area.find((c) => c.id === 'c')?.wounds).toBe(0);
    });
});
