import { describe, expect, it } from 'vitest';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { createCompanion } from './createGameState';
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
});
