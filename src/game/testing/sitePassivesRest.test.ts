import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { getEffectiveStrength } from '../../utils/cardStats';
import {
    abilityHasLegalEffectTarget,
    formatDesignationPrompt,
} from '../engine/abilities/designation';
import { canPayAbilityCost } from '../engine/abilities/payAbilityCost';
import { canUseAbility } from '../engine/canUseAbility';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { resolveSiteMoveAbilities } from '../engine/abilities/siteMove';
import { abilityMatchesTrigger, requestWounds } from '../engine/responseWindow';
import { applyAutomaticToPlayCosts } from '../logic/applyToPlayCosts';
import { applyHeal } from '../../utils/applyHeal';
import { canTransferAid } from '../engine/validations/canTransferAid';
import { applyReinforce } from '../logic/cultureTokens';
import {
    areBurdenRemovalsForbidden,
    areCultureTokenChangesForbidden,
    areHealsForbidden,
    isFollowerTransferForbidden,
    isWoundPreventionForbidden,
} from '../logic/sites';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createFollower,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const LAST_STAND_FELLOWSHIP: Ability = {
    id: '18U21:0',
    phases: ['FELLOWSHIP'],
    cost: [
        {
            exert: [
                {
                    count: 1,
                    target: [['GANDALF', 'MAN']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [
        {
            type: 'PLACE_CULTURE_TOKEN',
            culture: 'GANDALF',
            count: 2,
            target: 'SELF',
        },
    ],
    source: 'SELF',
};

const LAST_STAND_SKIRMISH: Ability = {
    id: '18U21:1',
    phases: ['SKIRMISH'],
    cost: [
        {
            removeCultureTokens: {
                culture: 'GANDALF',
                count: 3,
                from: 'SELF',
            },
        },
    ],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 3,
            target: [['COMPANION']],
            expiresAtPhase: 'SKIRMISH',
        },
    ],
    source: 'SELF',
};

describe('parseSiteAbilities — passives rest', () => {
    it('Fords of Isen : +1 / carte portée', () => {
        expect(
            parseSiteAbilities(
                '**River.** Each character is strength +1 for each card borne by that character.',
                '13S191'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: [['CHARACTER']],
                        perBorneCards: true,
                    },
                ],
            }),
        ]);
    });

    it('Great Gates : plus de compagnons que de séides', () => {
        expect(
            parseSiteAbilities(
                '**Battleground.** While a player can spot more companions than minions, each minion is strength +1.',
                '13S192'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: {
                    type: 'WHILE',
                    moreCompanionsThanMinions: true,
                },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: [['MINION']],
                    },
                ],
            }),
        ]);
    });

    it('Nurn : contrôle → hunter minions +1', () => {
        expect(
            parseSiteAbilities(
                '**Plains.** While you control this site, each of your hunter minions is strength +1.',
                '17U148'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', controlThisSite: true },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: [['HUNTER', 'MINION']],
                        ownerIsSiteController: true,
                    },
                ],
            }),
        ]);
    });

    it('Streets of Bree : interdit transfert suivants', () => {
        expect(
            parseSiteAbilities(
                '**Dwelling.** While the fellowship is at this site, followers cannot be transferred to a character.',
                '18U140'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [{ type: 'FORBID_FOLLOWER_TRANSFER' }],
            }),
        ]);
    });

    it('Redhorn Pass : interdit jetons de culture', () => {
        expect(
            parseSiteAbilities(
                '**Mountain.** Culture tokens cannot be added, removed, or reinforced.',
                '13U194'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [{ type: 'FORBID_CULTURE_TOKEN_CHANGES' }],
            }),
        ]);
    });

    it('Wold Battlefield : Skirmish exert Man → damage +1', () => {
        expect(
            parseSiteAbilities(
                '**Plains. Skirmish:** Exert your Man (except an enduring Man) to make him or her **damage +1.**',
                '12U194'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['SKIRMISH'],
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['MAN']],
                                mode: 'DESIGNATION',
                                excludeKeywords: ['ENDURING'],
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: 'COST_TARGET',
                        expiresAtPhase: 'REGROUP',
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — passives rest', () => {
    it('Fords : +1 force par attachement', () => {
        const ability: Ability = {
            id: 'fords',
            phases: [],
            trigger: { type: 'WHILE' },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    target: [['CHARACTER']],
                    perBorneCards: true,
                },
            ],
            source: 'SELF',
        };
        const axe = createCard({
            id: 'axe',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
        });
        const companion = createCompanion({
            id: 'c1',
            strength: 5,
            attachments: [axe],
        });
        const site = createSite({
            id: '13S191',
            siteNumber: 1,
            abilities: [ability],
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [companion],
                }),
            },
        });
        expect(getEffectiveStrength(companion, G)).toBe(6);
    });

    it('Great Gates : séide +1 si plus de compagnons', () => {
        const ability: Ability = {
            id: 'gates',
            phases: [],
            trigger: { type: 'WHILE', moreCompanionsThanMinions: true },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    target: [['MINION']],
                },
            ],
            source: 'SELF',
        };
        const minion = createMinion({ id: 'm1', strength: 8 });
        const site = createSite({
            id: '13S192',
            siteNumber: 1,
            abilities: [ability],
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site, null, null, null, null, null, null, null, null],
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({ id: 'c1' }),
                        createCompanion({ id: 'c2' }),
                    ],
                }),
            },
        });
        expect(getEffectiveStrength(minion, G)).toBe(9);

        // 2 séides = 2 compagnons → plus de bonus
        const minion2 = createMinion({ id: 'm2', strength: 8 });
        G.battlefield = [minion, minion2];
        expect(getEffectiveStrength(minion, G)).toBe(8);
    });

    it('Nurn : hunter du contrôleur +1 hors site courant', () => {
        const ability: Ability = {
            id: 'nurn',
            phases: [],
            trigger: { type: 'WHILE', controlThisSite: true },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    target: [['HUNTER', 'MINION']],
                    ownerIsSiteController: true,
                },
            ],
            source: 'SELF',
        };
        const hunter = createMinion({
            id: 'h1',
            strength: 10,
            keywords: ['HUNTER 1'],
        });
        const nurn = createSite({
            id: '17U148',
            siteNumber: 6,
            abilities: [ability],
            controlledBy: '1',
        });
        const here = createSite({ id: 'here', siteNumber: 1 });
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `p-${i}`, siteNumber: i + 1 })
        );
        path[0] = here;
        path[5] = nurn;
        const G = createGameState({
            currentSiteIndex: 0,
            path,
            battlefield: [hunter],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
        });
        expect(getEffectiveStrength(hunter, G)).toBe(11);
    });

    it('Streets : bloque le transfert de suivant', () => {
        const site = createSite({
            id: '18U140',
            siteNumber: 1,
            abilities: [
                {
                    id: 'streets',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [{ type: 'FORBID_FOLLOWER_TRANSFER' }],
                    source: 'SELF',
                },
            ],
        });
        const follower = createFollower({
            id: 'f1',
            aidCost: { type: 'BURDEN', amount: 1 },
        });
        const companion = createCompanion({ id: 'c1' });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [companion],
                    supportArea: [follower],
                }),
            },
        });
        expect(isFollowerTransferForbidden(G)).toBe(true);
        expect(canTransferAid(follower, companion, G, '0').valid).toBe(false);
    });

    it('Redhorn : bloque reinforce', () => {
        const site = createSite({
            id: '13U194',
            siteNumber: 1,
            abilities: [
                {
                    id: 'redhorn',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [{ type: 'FORBID_CULTURE_TOKEN_CHANGES' }],
                    source: 'SELF',
                },
            ],
        });
        const cond = createCard({
            id: 'cond',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'GONDOR',
            cultureTokens: { GONDOR: 1 },
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    supportArea: [cond],
                }),
            },
        });
        expect(areCultureTokenChangesForbidden(G)).toBe(true);
        expect(applyReinforce(G, '0', 'GONDOR', 1, ['cond'])).toBe(0);
    });

    describe('Steward’s Tomb', () => {
        const TOMB_ABILITY: Ability = {
            id: 'tomb',
            phases: [],
            trigger: { type: 'WHILE' },
            cost: [],
            effects: [
                { type: 'FORBID_HEAL' },
                { type: 'FORBID_WOUND_PREVENTION' },
                { type: 'FORBID_REMOVE_BURDENS' },
            ],
            source: 'SELF',
        };
        const PREVENT_ABILITY: Ability = {
            id: 'prevent',
            phases: ['RESPONSE'],
            trigger: {
                type: 'ABOUT_TO_WOUND',
                target: [['COMPANION']],
            },
            cost: [],
            effects: [{ type: 'PREVENT_WOUND' }],
            source: 'SELF',
        };
        const HEAL_ABILITY: Ability = {
            id: 'heal',
            phases: ['FELLOWSHIP'],
            cost: [],
            effects: [{ type: 'HEAL', count: 1, target: 'SELF' }],
            source: 'SELF',
        };
        const REMOVE_BURDENS_ABILITY: Ability = {
            id: 'rb',
            phases: ['FELLOWSHIP'],
            cost: [],
            effects: [{ type: 'REMOVE_BURDENS', count: 1 }],
            source: 'SELF',
        };

        function buildState(withTomb: boolean) {
            const site = createSite({
                id: '18U139',
                siteNumber: 1,
                abilities: withTomb ? [TOMB_ABILITY] : [],
            });
            const hurt = createCompanion({
                id: 'hurt',
                title: 'Hurt',
                vitality: 4,
                wounds: 2,
                abilities: [HEAL_ABILITY, PREVENT_ABILITY],
            });
            const G = createGameState({
                currentSiteIndex: 0,
                path: [site, null, null, null, null, null, null, null, null],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        burdens: 3,
                        fellowshipArea: [hurt],
                    }),
                    '1': createPlayerState('1'),
                },
            });
            return { G, hurt };
        }

        it('expose les trois interdictions', () => {
            const { G } = buildState(true);
            expect(areHealsForbidden(G)).toBe(true);
            expect(isWoundPreventionForbidden(G)).toBe(true);
            expect(areBurdenRemovalsForbidden(G)).toBe(true);

            const free = buildState(false).G;
            expect(areHealsForbidden(free)).toBe(false);
            expect(isWoundPreventionForbidden(free)).toBe(false);
            expect(areBurdenRemovalsForbidden(free)).toBe(false);
        });

        it('applyHeal ne soigne rien', () => {
            const { G, hurt } = buildState(true);
            expect(applyHeal(G, hurt, 1)).toBe(0);
            expect(hurt.wounds).toBe(2);

            const free = buildState(false);
            expect(applyHeal(free.G, free.hurt, 1)).toBe(1);
            expect(free.hurt.wounds).toBe(1);
        });

        it('HEAL : capacité non légale et sans effet', () => {
            const { G, hurt } = buildState(true);
            expect(abilityHasLegalEffectTarget(G, hurt, HEAL_ABILITY)).toBe(
                false
            );
            expect(applyAbilityEffect(G, hurt, HEAL_ABILITY)).toBe(false);
            expect(hurt.wounds).toBe(2);

            const free = buildState(false);
            expect(
                abilityHasLegalEffectTarget(free.G, free.hurt, HEAL_ABILITY)
            ).toBe(true);
        });

        it('REMOVE_BURDENS : sans effet', () => {
            const { G, hurt } = buildState(true);
            expect(
                abilityHasLegalEffectTarget(G, hurt, REMOVE_BURDENS_ABILITY)
            ).toBe(false);
            expect(applyAbilityEffect(G, hurt, REMOVE_BURDENS_ABILITY)).toBe(
                false
            );
            expect(G.players['0']?.burdens).toBe(3);

            const free = buildState(false);
            expect(
                applyAbilityEffect(free.G, free.hurt, REMOVE_BURDENS_ABILITY)
            ).toBe(true);
            expect(free.G.players['0']?.burdens).toBe(2);
        });

        it('toPlay removeBurdens : fardeaux conservés', () => {
            const { G } = buildState(true);
            const card = createCard({
                id: 'cost-card',
                kind: 'FREE_PEOPLE',
                type: 'EVENT',
                toPlay: [{ removeBurdens: 1 }],
            });
            expect(applyAutomaticToPlayCosts(G, card, '0')).toBeNull();
            expect(G.players['0']?.burdens).toBe(3);
        });

        it('moves from : REMOVE_BURDENS / HEAL de site sans effet', () => {
            const { G, hurt } = buildState(true);
            const other = createSite({
                id: 'other',
                abilities: [
                    {
                        id: 'o:0',
                        phases: [],
                        trigger: { type: 'MOVES_FROM' },
                        cost: [],
                        effects: [
                            { type: 'REMOVE_BURDENS', count: 2 },
                            {
                                type: 'HEAL',
                                all: true,
                                count: 1,
                                target: [['COMPANION']],
                            },
                        ],
                        source: 'SELF',
                    },
                ],
            });
            resolveSiteMoveAbilities(G, other, 'MOVES_FROM');
            expect(G.players['0']?.burdens).toBe(3);
            expect(hurt.wounds).toBe(2);
        });

        it('PREVENT_WOUND : plus légal en ABOUT_TO_WOUND', () => {
            const { G, hurt } = buildState(true);
            const event = {
                type: 'ABOUT_TO_WOUND' as const,
                targetId: 'hurt',
                remaining: 1,
            };
            expect(abilityMatchesTrigger(PREVENT_ABILITY, event, hurt, G)).toBe(
                false
            );

            const free = buildState(false);
            expect(
                abilityMatchesTrigger(
                    PREVENT_ABILITY,
                    event,
                    free.hurt,
                    free.G
                )
            ).toBe(true);
        });

        it('PREVENT_WOUND : applyAbilityEffect refuse, pas de fenêtre de réponse', () => {
            const { G, hurt } = buildState(true);
            G.pendingEvent = {
                type: 'ABOUT_TO_WOUND',
                targetId: 'hurt',
                remaining: 1,
            };
            expect(applyAbilityEffect(G, hurt, PREVENT_ABILITY)).toBe(false);
            expect(G.pendingEvent.remaining).toBe(1);

            const { G: G2, hurt: hurt2 } = buildState(true);
            expect(requestWounds(G2, hurt2, 1)).toBe('APPLIED');
            expect(hurt2.wounds).toBe(3);
            expect(G2.responseWindow?.isOpen).toBeFalsy();
        });
    });

    it('Last Stand : toaster FR Homme Gandalf', () => {
        expect(formatDesignationPrompt(LAST_STAND_FELLOWSHIP, 'cost')).toBe(
            'Choisissez un homme <symbol>gandalf</symbol>.'
        );
    });

    it('Redhorn : Last Stand non activable (place / retire jetons)', () => {
        const site = createSite({
            id: '13U194',
            siteNumber: 4,
            abilities: [
                {
                    id: 'redhorn',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [{ type: 'FORBID_CULTURE_TOKEN_CHANGES' }],
                    source: 'SELF',
                },
            ],
        });
        const erland = createCompanion({
            id: 'erland',
            title: 'Erland',
            culture: 'GANDALF',
            race: 'MAN',
            vitality: 3,
        });
        const lastStand = createCard({
            id: '18U21',
            title: 'Last Stand',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            culture: 'GANDALF',
            cultureTokens: { GANDALF: 3 },
            abilities: [LAST_STAND_FELLOWSHIP, LAST_STAND_SKIRMISH],
            actionPhases: ['FELLOWSHIP', 'SKIRMISH'],
        });
        const G = createGameState({
            currentSiteIndex: 3,
            path: [null, null, null, site, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 3,
                    fellowshipArea: [erland],
                    supportArea: [lastStand],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(areCultureTokenChangesForbidden(G)).toBe(true);
        expect(
            abilityHasLegalEffectTarget(G, lastStand, LAST_STAND_FELLOWSHIP)
        ).toBe(false);
        expect(
            canPayAbilityCost(G, lastStand, LAST_STAND_SKIRMISH.cost)
        ).toBe(false);
        expect(
            canUseAbility(lastStand, {
                G,
                ctx: { phase: 'fellowship' },
                playerID: '0',
            }).valid
        ).toBe(false);
        expect(
            canUseAbility(lastStand, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });
});
