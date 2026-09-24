import { describe, expect, it } from 'vitest';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import { checkPhases } from '../engine/validations/checkPhases';
import { isSkirmishActionForbidden } from '../logic/skirmishActionRestrictions';
import {
    createCompanion,
    createGameState,
    createMinion,
    createCard,
    createPlayerState,
} from './createGameState';
import type { Ability, SiteCardState } from '../types';

const forbidOpponentInvolving: Ability = {
    id: 'faramir:forbid',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [
        {
            type: 'FORBID_SKIRMISH_ACTIONS',
            who: 'OPPONENT',
            events: true,
            specialAbilities: true,
            involvingSource: true,
        },
    ],
    source: 'SELF',
};

const forbidAllAbilitiesSite: Ability = {
    id: 'cavern:forbid',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [
        {
            type: 'FORBID_SKIRMISH_ACTIONS',
            who: 'ALL',
            events: false,
            specialAbilities: true,
        },
    ],
    source: 'SELF',
};

const forbidAllBothSite: Ability = {
    id: 'cavern-old:forbid',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [
        {
            type: 'FORBID_SKIRMISH_ACTIONS',
            who: 'ALL',
            events: true,
            specialAbilities: true,
        },
    ],
    source: 'SELF',
};

const skirmishAbility: Ability = {
    id: 'cond:0',
    phases: ['SKIRMISH'],
    cost: [],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 2,
            target: 'SELF',
            expiresAtPhase: 'SKIRMISH',
        },
    ],
    source: 'SELF',
};

describe('skirmishActionRestrictions', () => {
    it('Faramir : bloque adversaire seulement si combat l’implique', () => {
        const faramir = createCompanion({
            id: '0P16',
            instanceId: 'faramir',
            abilities: [forbidOpponentInvolving],
        });
        const gimli = createCompanion({
            id: 'gimli',
            instanceId: 'gimli',
        });
        const condition = createCard({
            id: '13U103',
            instanceId: 'threat',
            type: 'CONDITION',
            kind: 'SHADOW',
            actionPhases: ['SKIRMISH'],
            abilities: [skirmishAbility],
        });
        const minion = createMinion({ id: 'orc', instanceId: 'orc' });

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [faramir, gimli],
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
            battlefield: [minion],
            skirmishes: [
                {
                    id: 'sk-faramir',
                    companionId: 'faramir',
                    minionIds: ['orc'],
                },
                {
                    id: 'sk-gimli',
                    companionId: 'gimli',
                    minionIds: ['orc'],
                },
            ],
            activeSkirmishId: 'sk-faramir',
        });

        expect(
            isSkirmishActionForbidden(G, '1', 'SPECIAL_ABILITY')
        ).toBe(true);
        expect(isSkirmishActionForbidden(G, '0', 'SPECIAL_ABILITY')).toBe(
            false
        );
        expect(
            abilityMeetsPlayRestrictions(G, condition, skirmishAbility)
        ).toBe(false);

        G.activeSkirmishId = 'sk-gimli';
        expect(
            isSkirmishActionForbidden(G, '1', 'SPECIAL_ABILITY')
        ).toBe(false);
        expect(
            abilityMeetsPlayRestrictions(G, condition, skirmishAbility)
        ).toBe(true);
    });

    it('Cavern Entrance 11S232 : capacités interdites, events OK', () => {
        const site: SiteCardState = {
            id: '11S232',
            name: 'Cavern Entrance',
            twilightCost: 0,
            gameText: 'Skirmish special abilities cannot be used.',
            ownerId: '0',
            abilities: [forbidAllAbilitiesSite],
        };
        const G = createGameState({
            path: [site, null, null, null, null, null, null, null, null],
            currentSiteIndex: 0,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1'),
            },
            activeSkirmishId: 'sk-1',
            skirmishes: [
                { id: 'sk-1', companionId: 'c', minionIds: ['m'] },
            ],
        });

        expect(
            isSkirmishActionForbidden(G, '0', 'SPECIAL_ABILITY')
        ).toBe(true);
        expect(
            isSkirmishActionForbidden(G, '1', 'SPECIAL_ABILITY')
        ).toBe(true);
        expect(isSkirmishActionForbidden(G, '0', 'EVENT')).toBe(false);
        expect(isSkirmishActionForbidden(G, '1', 'EVENT')).toBe(false);
    });

    it('Cavern Entrance 4U355 : events + capacités', () => {
        const site: SiteCardState = {
            id: '4U355',
            name: 'Cavern Entrance',
            twilightCost: 0,
            gameText:
                'Skirmish events may not be played and skirmish special abilities may not be used.',
            ownerId: '0',
            abilities: [forbidAllBothSite],
        };
        const G = createGameState({
            path: [site, null, null, null, null, null, null, null, null],
            currentSiteIndex: 0,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1'),
            },
            activeSkirmishId: 'sk-1',
            skirmishes: [
                { id: 'sk-1', companionId: 'c', minionIds: ['m'] },
            ],
        });

        expect(isSkirmishActionForbidden(G, '1', 'EVENT')).toBe(true);
        expect(
            isSkirmishActionForbidden(G, '1', 'SPECIAL_ABILITY')
        ).toBe(true);

        const event = createCard({
            id: 'evt',
            type: 'EVENT',
            kind: 'SHADOW',
            phases: ['SKIRMISH'],
        });
        expect(
            checkPhases(event, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '1',
            }).valid
        ).toBe(false);
    });
});
