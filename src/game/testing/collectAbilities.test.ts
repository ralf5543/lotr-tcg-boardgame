import { describe, expect, it } from 'vitest';
import {
    abilityProjectsOnto,
    collectVisibleAbilities,
    formatAbilityLabelParts,
} from '../engine/abilities/collectAbilities';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

describe('formatAbilityLabelParts', () => {
    it('Aragorn SELF : coût majuscule, mot-clé sans cible', () => {
        const ability: Ability = {
            id: '1R89:0',
            phases: ['MANEUVER'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'DEFENDER +1',
                    target: 'SELF',
                    expiresAtPhase: 'REGROUP',
                },
            ],
            source: 'SELF',
        };
        const aragorn = createCompanion({
            id: '1R89',
            title: 'Aragorn',
            i18n: { fr: { title: 'Aragorn' } },
        });
        expect(formatAbilityLabelParts(ability, aragorn)).toEqual({
            cost: 'Affaiblir Aragorn',
            effect: 'Défenseur + 1',
        });
    });

    it('Faramir : précise le Hobbit dissocié qui gagne la force', () => {
        const ability: Ability = {
            id: '7R91:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: [['UNBOUND', 'HOBBIT']],
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };
        const faramir = createCompanion({
            id: '7R91',
            title: 'Faramir',
            i18n: { fr: { title: 'Faramir' } },
        });
        expect(formatAbilityLabelParts(ability, faramir)).toEqual({
            cost: 'Affaiblir Faramir',
            effect: 'force +2 à un Hobbit dissocié',
        });
    });

    it('Sylvebarbe Affectation : coût désigné + permettre de combattre', () => {
        const ability: Ability = {
            id: '0P21:0',
            phases: ['ASSIGNMENT'],
            cost: [
                {
                    exert: [
                        {
                            count: 1,
                            target: [['UNBOUND', 'HOBBIT']],
                            mode: 'DESIGNATION',
                        },
                    ],
                },
            ],
            effects: [{ type: 'ALLOW_SKIRMISH', target: 'SELF' }],
            source: 'SELF',
        };
        const treebeard = createCompanion({
            id: '0P21',
            title: 'Treebeard',
            i18n: { fr: { title: 'Sylvebarbe' } },
        });
        expect(formatAbilityLabelParts(ability, treebeard)).toEqual({
            cost: 'Affaiblir un Hobbit dissocié',
            effect: 'permettre à Sylvebarbe de combattre',
        });
    });

    it('Frénésie : retirer le crépuscule, acharné sans nommer le vainqueur', () => {
        const ability: Ability = {
            id: '1U159:0',
            phases: ['RESPONSE'],
            trigger: {
                type: 'WINS_SKIRMISH',
                winner: [['URUK-HAI']],
                yours: true,
            },
            cost: [{ removeTwilight: 3 }],
            effects: [
                {
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'FIERCE',
                    target: 'WINNER',
                    expiresAtPhase: 'REGROUP',
                },
            ],
            source: 'SELF',
        };
        const rampage = createCompanion({
            id: '1U159',
            title: 'Uruk-hai Rampage',
            i18n: { fr: { title: 'Frénésie Ourouk-Haï' } },
        });
        expect(formatAbilityLabelParts(ability, rampage)).toEqual({
            cost: 'Retirer <symbol>twilight3</symbol>',
            effect: 'Acharné',
        });
    });

    it('Fouilles : affaiblir un compagnon Nain, piocher 3', () => {
        const ability: Ability = {
            id: '1C6:0',
            phases: ['FELLOWSHIP'],
            cost: [
                {
                    exert: [
                        {
                            count: 1,
                            target: [['DWARF', 'COMPANION']],
                            mode: 'DESIGNATION',
                        },
                    ],
                },
            ],
            effects: [{ type: 'DRAW', count: 3 }],
            source: 'SELF',
        };
        const delving = createCompanion({
            id: '1C6',
            title: 'Delving',
            i18n: { fr: { title: 'Fouilles' } },
        });
        expect(formatAbilityLabelParts(ability, delving)).toEqual({
            cost: 'Affaiblir un Nain Compagnon',
            effect: 'piocher 3 cartes',
        });
    });

    it('Celeborn : guérir un allié elfe', () => {
        const ability: Ability = {
            id: '1R34:0',
            phases: ['FELLOWSHIP'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                { type: 'HEAL', count: 1, target: [['ELVEN', 'ALLY']] },
            ],
            source: 'SELF',
        };
        const celeborn = createCompanion({
            id: '1R34',
            title: 'Celeborn',
            i18n: { fr: { title: 'Celeborn' } },
        });
        expect(formatAbilityLabelParts(ability, celeborn)).toEqual({
            cost: 'Affaiblir Celeborn',
            effect: 'guérir un allié <symbol>elven</symbol>',
        });
    });

    it('Cape de Boromir : défausser une situation climat', () => {
        const ability: Ability = {
            id: '1U98:0',
            phases: ['MANEUVER'],
            cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
            effects: [
                {
                    type: 'DISCARD',
                    count: 1,
                    target: [['WEATHER', 'CONDITION']],
                },
            ],
            source: 'ATTACHMENT',
        };
        const cloak = createCompanion({
            id: '1U98',
            title: "Boromir's Cloak",
            i18n: { fr: { title: 'Cape de Boromir' } },
        });
        expect(formatAbilityLabelParts(ability, cloak)).toEqual({
            cost: 'Affaiblir le détenteur',
            effect: 'défausser un climat Situation',
        });
    });

    it('Arwen : défausser 3 cartes de la main', () => {
        const ability: Ability = {
            id: '3U7:0',
            phases: ['RESPONSE'],
            trigger: {
                type: 'ABOUT_TO_WOUND',
                target: [['RING-BEARER']],
            },
            cost: [{ discardFromHand: 3 }],
            effects: [{ type: 'PREVENT_WOUND' }],
            source: 'SELF',
        };
        const arwen = createCompanion({
            id: '3U7',
            title: 'Arwen',
            i18n: { fr: { title: 'Arwen' } },
        });
        expect(formatAbilityLabelParts(ability, arwen)).toEqual({
            cost: 'Défausser 3 cartes de la main',
            effect: 'empêcher cette blessure',
        });
    });

    it('Nelya : replace site sans filtre', () => {
        const ability: Ability = {
            id: '11S222:0',
            phases: ['SHADOW'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'REPLACE_SITE',
                    scope: 'CURRENT',
                    from: 'SITES_DECK',
                },
            ],
            source: 'SELF',
        };
        const nelya = createCompanion({
            id: '11S222',
            title: 'Úlairë Nelya',
            kind: 'SHADOW',
            type: 'MINION',
            i18n: { fr: { title: 'Úlairë Nelya' } },
        });
        expect(formatAbilityLabelParts(ability, nelya)).toEqual({
            cost: 'Affaiblir Úlairë Nelya',
            effect:
                'remplacer le site actuel par un site du deck d’aventure',
        });
    });

    it('Unforgiving Depths : défausse + spot + replace underground', () => {
        const ability: Ability = {
            id: '13C120:0',
            phases: ['SHADOW'],
            cost: [
                {
                    discardFromPlay: [{ count: 1, target: 'SELF' }],
                    spot: [{ count: 1, target: [['ORC', 'MINION']] }],
                },
            ],
            effects: [
                {
                    type: 'REPLACE_SITE',
                    scope: 'CURRENT',
                    from: 'SITES_DECK',
                    siteKeyword: 'UNDERGROUND',
                },
            ],
            source: 'SELF',
        };
        const depths = createCompanion({
            id: '13C120',
            title: 'Unforgiving Depths',
            kind: 'SHADOW',
            type: 'CONDITION',
            i18n: { fr: { title: 'Profondeurs Impitoyables' } },
        });
        expect(formatAbilityLabelParts(ability, depths)).toEqual({
            cost: 'Désigner un séide <symbol>orc</symbol> et Défausser Profondeurs Impitoyables',
            effect:
                'remplacer le site actuel par un site souterrain du deck d’aventure',
        });
    });

    it('Officer : SAURON + ORC → orque + symbole culture (pas symbole orc)', () => {
        const ability: Ability = {
            id: '7R274:0',
            phases: ['SKIRMISH'],
            cost: [{ discardFromHand: 2 }],
            effects: [
                {
                    type: 'PLAY_FROM_STACK',
                    target: [['SAURON', 'ORC']],
                    grantsTempKeywords: [
                        { keyword: 'FIERCE', expiresAtPhase: 'REGROUP' },
                    ],
                    grantsTempStats: [
                        {
                            stat: 'STRENGTH',
                            value: 6,
                            expiresAtPhase: 'REGROUP',
                        },
                    ],
                },
            ],
            source: 'SELF',
        };
        const officer = createMinion({
            id: '7R274',
            title: 'Gorgoroth Officer',
            i18n: { fr: { title: 'Gorgoroth Officer' } },
        });
        expect(formatAbilityLabelParts(ability, officer)).toEqual({
            cost: 'Défausser 2 cartes de la main',
            effect:
                'jouer un orque <symbol>sauron</symbol> empilé sur un site que vous contrôlez (Acharné et force +6 jusqu’au ralliement)',
        });
    });

    it('Men + Man : culture symbole + race Homme (pas symbole men pour Man)', () => {
        const ability: Ability = {
            id: 'test-men:0',
            phases: ['SKIRMISH'],
            cost: [],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    target: [['MEN', 'MAN']],
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };
        const card = createMinion({ id: 'test-men' });
        expect(formatAbilityLabelParts(ability, card).effect).toBe(
            'Force +1 à un homme <symbol>men</symbol>'
        );
    });

    it('Forests : Ring-bound Man → Homme associé à l’Anneau ; défausse nommée', () => {
        const ability: Ability = {
            id: '4R121:0',
            phases: ['REGROUP'],
            cost: [
                {
                    discardFromPlay: [{ count: 1, target: 'SELF' }],
                    exert: [
                        {
                            count: 1,
                            target: [['RING-BOUND', 'MAN']],
                            mode: 'DESIGNATION',
                        },
                    ],
                },
            ],
            effects: [{ type: 'LIBERATE_SITE' }],
            source: 'SELF',
        };
        const forests = createCompanion({
            id: '4R121',
            title: 'Forests of Ithilien',
            type: 'CONDITION',
            i18n: { fr: { title: 'Forêts d’Ithilien' } },
        });
        expect(formatAbilityLabelParts(ability, forests)).toEqual({
            cost: "Affaiblir un Homme associé à l'anneau et Défausser Forêts d’Ithilien",
            effect: 'libérer un site',
        });
    });

    it('Sturdy Shield : défausse nommée (pas « cette carte »)', () => {
        const ability: Ability = {
            id: '15R141:0',
            phases: ['REGROUP'],
            cost: [
                {
                    discardFromPlay: [{ count: 1, target: 'SELF' }],
                },
            ],
            effects: [{ type: 'LIBERATE_SITE' }],
            source: 'SELF',
        };
        const shield = createCompanion({
            id: '15R141',
            title: 'Sturdy Shield',
            type: 'POSSESSION',
            i18n: { fr: { title: 'Bouclier solide' } },
        });
        expect(formatAbilityLabelParts(ability, shield)).toEqual({
            cost: 'Défausser Bouclier solide',
            effect: 'libérer un site',
        });
    });

    it('stack autre séide : empiler un assiégeant / un séide de Sauron', () => {
        const troll: Ability = {
            id: '8R108:0',
            phases: ['REGROUP'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'STACK_ON_CONTROLLED_SITE',
                    target: [['BESIEGER']],
                },
            ],
            source: 'SELF',
        };
        const engine: Ability = {
            id: '8U107:0',
            phases: ['REGROUP'],
            cost: [{ removeThreats: 1 }],
            effects: [
                {
                    type: 'STACK_ON_CONTROLLED_SITE',
                    target: [['SAURON', 'MINION']],
                },
            ],
            source: 'SELF',
        };
        const selfStack: Ability = {
            id: '4C180:0',
            phases: ['REGROUP'],
            cost: [],
            effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
            source: 'SELF',
        };
        const card = createMinion({
            id: '8R108',
            title: 'Troll of Gorgoroth',
            i18n: { fr: { title: 'Troll de Gorgoroth' } },
        });
        expect(formatAbilityLabelParts(troll, card)).toEqual({
            cost: 'Affaiblir Troll de Gorgoroth',
            effect: 'empiler un assiégeant sur un site que vous contrôlez',
        });
        expect(formatAbilityLabelParts(engine, card)).toEqual({
            cost: 'Retirer 1 menace',
            effect:
                'empiler un séide <symbol>sauron</symbol> sur un site que vous contrôlez',
        });
        expect(formatAbilityLabelParts(selfStack, card)).toEqual({
            cost: '',
            effect: 'Empiler ce séide sur un site que vous contrôlez',
        });
    });

    it('culture + race/type : symbole culture (FormattedText), pas « de Sauron »', () => {
        const dunland: Ability = {
            id: '4C14:0',
            phases: ['RESPONSE'],
            cost: [
                {
                    spot: [
                        {
                            count: 1,
                            target: [['DUNLAND', 'MAN']],
                            excludeSource: true,
                        },
                    ],
                },
            ],
            effects: [{ type: 'TAKE_CONTROL_SITE' }],
            source: 'SELF',
        };
        const gondor: Ability = {
            id: 'x:0',
            phases: ['FELLOWSHIP'],
            cost: [
                {
                    exert: [
                        {
                            count: 1,
                            target: [['GONDOR', 'MAN']],
                            mode: 'DESIGNATION',
                        },
                    ],
                },
            ],
            effects: [{ type: 'DRAW', count: 1 }],
            source: 'SELF',
        };
        const card = createCompanion({ id: 'x', title: 'X' });
        expect(formatAbilityLabelParts(dunland, card)).toEqual({
            cost: 'Désigner un homme <symbol>dunland</symbol>',
            effect: 'prendre le contrôle d’un site',
        });
        expect(formatAbilityLabelParts(gondor, card)).toEqual({
            cost: 'Affaiblir un homme <symbol>gondor</symbol>',
            effect: 'piocher 1 carte',
        });
    });

    it('EXHAUST : libellé d’effet après les deux-points', () => {
        const ability: Ability = {
            id: '3R65:dev',
            phases: ['REGROUP'],
            cost: [{ exert: [{ count: 2, target: 'SELF' }] }],
            effects: [
                {
                    type: 'EXHAUST',
                    target: [['COMPANION']],
                    excludeRingBearer: true,
                },
            ],
            source: 'SELF',
        };
        const overseer = createCompanion({
            id: '3R65',
            title: 'Orc Overseer',
            kind: 'SHADOW',
            type: 'MINION',
            i18n: { fr: { title: 'Surveillant orque' } },
        });
        expect(formatAbilityLabelParts(ability, overseer)).toEqual({
            cost: 'Affaiblir Surveillant orque 2 fois',
            effect: 'épuiser un Compagnon (sauf le Porteur de l’Anneau)',
        });
    });
    it('Hache lourde sur Glóin : préfixe le nom de l’attachement', () => {
        const ability: Ability = {
            id: '15U7:0',
            phases: ['SKIRMISH'],
            cost: [
                {
                    removeCultureTokens: {
                        culture: 'DWARVEN',
                        count: 1,
                    },
                },
            ],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    target: 'BEARER',
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'ATTACHMENT',
        };
        const axe = createCard({
            id: '15U7',
            title: 'Heavy Axe',
            type: 'POSSESSION',
            i18n: { fr: { title: 'Hache lourde' } },
        });
        const gloin = createCompanion({
            id: '15R6',
            title: 'Glóin',
            i18n: { fr: { title: 'Glóin' } },
        });
        expect(formatAbilityLabelParts(ability, axe, gloin)).toEqual({
            cost: 'Hache lourde — Retirer 1 jeton <symbol>dwarven</symbol>',
            effect: expect.stringMatching(/force \+1/i),
        });
        // Projection support ≠ attachement : pas de préfixe « Périls… »
        const perilsAbility: Ability = {
            id: '3C36:0',
            phases: ['RESPONSE'],
            cost: [
                {
                    exert: [{ count: 1, target: [['Gandalf']] }],
                },
            ],
            effects: [{ type: 'PREVENT_WOUND' }],
            source: 'SELF',
        };
        const perils = createCard({
            id: '3C36',
            title: 'Unknown Perils',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            i18n: { fr: { title: 'Périls inconnus' } },
        });
        const gandalf = createCompanion({
            id: 'gandalf',
            title: 'Gandalf',
            i18n: { fr: { title: 'Gandalf' } },
        });
        const labeled = formatAbilityLabelParts(
            perilsAbility,
            perils,
            gandalf
        );
        expect(labeled.cost).not.toMatch(/Périls|—/);
        expect(labeled.cost).toMatch(/Affaiblir/i);
    });
});

describe('collectVisibleAbilities — support area vs projection', () => {
    const lastStandFellowship: Ability = {
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

    const unknownPerils: Ability = {
        id: '3C36:0',
        phases: ['RESPONSE'],
        trigger: { type: 'ABOUT_TO_WOUND', target: [['COMPANION']] },
        cost: [
            {
                spotTwilight: 4,
                exert: [{ count: 1, target: [['Gandalf']] }],
            },
        ],
        effects: [{ type: 'PREVENT_WOUND' }],
        source: 'SELF',
    };

    it('Last Stand (classe) : bouton sur la situation, pas sur l’Homme Gandalf', () => {
        const erland = createCompanion({
            id: 'erland',
            title: 'Erland',
            culture: 'GANDALF',
            race: 'MAN',
        });
        const lastStand = createCard({
            id: '18U21',
            title: 'Last Stand',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            culture: 'GANDALF',
            abilities: [lastStandFellowship],
            actionPhases: ['FELLOWSHIP'],
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [erland],
                    supportArea: [lastStand],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(
            collectVisibleAbilities(G, lastStand).map((r) => r.ability.id)
        ).toEqual(['18U21:0']);
        expect(collectVisibleAbilities(G, erland)).toEqual([]);
        expect(abilityProjectsOnto(G, lastStand, lastStandFellowship, erland)).toBe(
            false
        );
    });

    it('Périls inconnus (nom propre) : projection sur Gandalf, pas sur la situation', () => {
        const gandalf = createCompanion({
            id: 'gandalf',
            title: 'Gandalf',
            culture: 'GANDALF',
            race: 'WIZARD',
        });
        const perils = createCard({
            id: '3C36',
            title: 'Unknown Perils',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            abilities: [unknownPerils],
            actionPhases: ['RESPONSE'],
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 4,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf],
                    supportArea: [perils],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(collectVisibleAbilities(G, perils)).toEqual([]);
        expect(
            collectVisibleAbilities(G, gandalf).map((r) => ({
                sourceId: r.source.id,
                abilityId: r.ability.id,
            }))
        ).toEqual([{ sourceId: '3C36', abilityId: '3C36:0' }]);
        expect(abilityProjectsOnto(G, perils, unknownPerils, gandalf)).toBe(
            true
        );
    });
});
