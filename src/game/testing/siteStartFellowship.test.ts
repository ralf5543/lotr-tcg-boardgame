import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCount,
} from '../engine/abilities/designation';
import { hasActionableStartOfPhaseCards } from '../logic/hasActionableStartOfPhaseCards';
import { beginOptionalSiteStartAbility } from '../logic/siteStartAbility';
import {
    getDeckOrDiscardPlayCandidates,
    playCardFromDeckOrDiscard,
} from '../logic/playFromOutOfPlay';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
    createCard,
} from './createGameState';

describe('parseSiteAbilities — début de fellowship', () => {
    it('Old Forest Road : heal 2 Elves', () => {
        const text =
            '**Forest.** At the start of your fellowship phase, you may heal 2 Elves.';
        expect(parseSiteAbilities(text, '11S251')).toEqual([
            expect.objectContaining({
                phases: ['START_OF_FELLOWSHIP'],
                optional: true,
                effects: [
                    {
                        type: 'HEAL',
                        count: 1,
                        multiCount: 2,
                        target: [['ELF']],
                    },
                ],
            }),
        ]);
    });

    it('Dammed Gate-stream : play Gollum Free Peoples from deck', () => {
        const text =
            '**Marsh.** At the start of your fellowship phase, you may play a <symbol>gollum</symbol> Free Peoples card from your draw deck.';
        expect(parseSiteAbilities(text, '11U235')).toEqual([
            expect.objectContaining({
                phases: ['START_OF_FELLOWSHIP'],
                cost: [],
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        target: [['GOLLUM', 'FREE_PEOPLES']],
                        from: 'DECK',
                    },
                ],
            }),
        ]);
    });

    it('Prancing Pony : add burden → play ranger', () => {
        const text =
            '**Dwelling.** At the start of your fellowship phase, you may add a burden to play a ranger from your draw deck.';
        expect(parseSiteAbilities(text, '11S256')).toEqual([
            expect.objectContaining({
                cost: [{ addBurdens: 1 }],
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        target: [['RANGER']],
                        from: 'DECK',
                    },
                ],
            }),
        ]);
    });

    it('Barazinbar : exert Dwarf → dwarven possession', () => {
        const text =
            '**Mountain.** At the start of your fellowship phase, you may exert a Dwarf to play a <symbol>dwarven</symbol> possession from your draw deck.';
        expect(parseSiteAbilities(text, '11S229')).toEqual([
            expect.objectContaining({
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['DWARF']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        target: [['DWARVEN', 'POSSESSION']],
                        from: 'DECK',
                    },
                ],
            }),
        ]);
    });

    it('Green Dragon : exert 2 Hobbits (distincts) → play Hobbit', () => {
        const text =
            '**Dwelling.** At the start of your fellowship phase, you may exert 2 Hobbits to play a Hobbit from your draw deck.';
        expect(parseSiteAbilities(text, '11S242')).toEqual([
            expect.objectContaining({
                phases: ['START_OF_FELLOWSHIP'],
                optional: true,
                cost: [
                    {
                        exert: [
                            {
                                count: 2,
                                target: [['HOBBIT']],
                                mode: 'DESIGNATION',
                                distinctTargets: true,
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        target: [['HOBBIT']],
                        from: 'DECK',
                    },
                ],
            }),
        ]);
    });

    it('East Wall of Rohan : « the fellowship phase » → exert 2 hunters distincts', () => {
        const text =
            'At the start of the fellowship phase, you may exert two hunter companions to play a hunter companion from your draw deck.';
        expect(parseSiteAbilities(text, '15S190')).toEqual([
            expect.objectContaining({
                phases: ['START_OF_FELLOWSHIP'],
                optional: true,
                cost: [
                    {
                        exert: [
                            {
                                count: 2,
                                target: [['HUNTER', 'COMPANION']],
                                mode: 'DESIGNATION',
                                distinctTargets: true,
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        target: [['HUNTER', 'COMPANION']],
                        from: 'DECK',
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — start fellowship sites', () => {
    const healAbility: Ability = {
        id: '11S251:0:site-start-fp',
        phases: ['START_OF_FELLOWSHIP'],
        optional: true,
        cost: [],
        effects: [
            {
                type: 'HEAL',
                count: 1,
                multiCount: 2,
                target: [['ELF']],
            },
        ],
        source: 'SELF',
    };

    it('ouvre pendingSiteStartAbility (toaster) plutôt qu’un dual-wait site', () => {
        const site = createSite({
            id: '11S251',
            instanceId: 'site-of',
            abilities: [healAbility],
            actionPhases: ['START_OF_FELLOWSHIP'],
            siteNumber: 3,
        });
        const legolas = createCompanion({
            id: 'legolas',
            instanceId: 'legolas-1',
            race: 'ELF',
            wounds: 1,
        });
        const G = createGameState({
            path: [
                null,
                null,
                site,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 2,
                    fellowshipArea: [legolas],
                }),
            },
        });
        expect(beginOptionalSiteStartAbility(G, 'startOfFellowship')).toBe(
            true
        );
        expect(G.pendingSiteStartAbility?.abilityId).toBe(healAbility.id);
        expect(G.startOfPhaseState).toBeUndefined();
        // Le site ne passe pas par le dual-wait « cartes actionables ».
        expect(
            hasActionableStartOfPhaseCards(
                G.players['0']!,
                G,
                '0',
                'startOfFellowship'
            )
        ).toBe(false);
    });

    it('heal multiCount soigne 2 Elfes distincts', () => {
        const site = createSite({
            id: '11S251',
            instanceId: 'site-of',
            abilities: [healAbility],
        });
        const a = createCompanion({
            id: 'e1',
            instanceId: 'e1',
            race: 'ELF',
            wounds: 1,
        });
        const b = createCompanion({
            id: 'e2',
            instanceId: 'e2',
            race: 'ELF',
            wounds: 1,
        });
        const G = createGameState({
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [a, b],
                }),
            },
        });
        expect(getEffectDesignationCount(G, site, healAbility)).toBe(2);
        expect(abilityHasLegalEffectTarget(G, site, healAbility)).toBe(true);
        expect(
            applyAbilityEffect(G, site, healAbility, ['e1', 'e2'])
        ).toBe(true);
        expect(a.wounds).toBe(0);
        expect(b.wounds).toBe(0);
    });

    it('play FP companion from deck : toPlay add burden (Sméagol)', () => {
        const smeagol = createCompanion({
            id: '5C28',
            instanceId: 'smeagol-deck',
            title: 'Sméagol',
            culture: 'GOLLUM',
            kind: 'FREE_PEOPLE',
            twilightCost: 0,
            toPlay: [{ addBurdens: 1 }],
        });
        const G = createGameState({
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    burdens: 0,
                    deck: [smeagol],
                    fellowshipArea: [
                        createCompanion({ id: 'frodo', instanceId: 'frodo' }),
                    ],
                }),
            },
        });
        const candidates = getDeckOrDiscardPlayCandidates(
            G,
            '0',
            [['GOLLUM', 'FREE_PEOPLES']],
            'fellowship',
            null,
            'DECK'
        );
        expect(candidates.map((c) => c.instanceId)).toEqual(['smeagol-deck']);
        const played = playCardFromDeckOrDiscard(
            G,
            '0',
            'smeagol-deck',
            [['GOLLUM', 'FREE_PEOPLES']],
            'fellowship',
            null,
            'DECK'
        );
        expect(played?.instanceId).toBe('smeagol-deck');
        expect(G.players['0']?.fellowshipArea.map((c) => c.instanceId)).toContain(
            'smeagol-deck'
        );
        expect(G.twilightPool).toBe(0);
        expect(G.players['0']?.burdens).toBe(1);
    });

    it('play possession attachée depuis la pioche', () => {
        const axe = createCard({
            id: '1C9',
            instanceId: 'axe-1',
            type: 'POSSESSION',
            culture: 'DWARVEN',
            kind: 'FREE_PEOPLE',
            subtype: 'HAND-WEAPON',
            twilightCost: 1,
            attachedTo: [['DWARF']],
        });
        const gimli = createCompanion({
            id: 'gimli',
            instanceId: 'gimli-1',
            race: 'DWARF',
        });
        const G = createGameState({
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    deck: [axe],
                    fellowshipArea: [gimli],
                }),
            },
        });
        const played = playCardFromDeckOrDiscard(
            G,
            '0',
            'axe-1',
            [['DWARVEN', 'POSSESSION']],
            'fellowship',
            gimli,
            'DECK'
        );
        expect(played?.instanceId).toBe('axe-1');
        expect(gimli.attachments?.map((c) => c.instanceId)).toEqual(['axe-1']);
        expect(G.twilightPool).toBe(1);
    });
});
