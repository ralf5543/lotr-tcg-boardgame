import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { abilityProjectsOnto } from '../engine/abilities/collectAbilities';
import { canUseAbility } from '../engine/canUseAbility';
import {
    canCardTakeWound,
    cannotTakeArcheryWoundsFromSite,
} from '../logic/sites';
import {
    beginOptionalSitePhaseAbility,
    resolvePendingSitePhaseAbility,
} from '../logic/sitePhaseAbility';
import type { Ability } from '../types';
import { createEngineClient, passBothActionWindows } from './createEngineClient';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('parseSiteAbilities — Valley / Uplands / Shores', () => {
    it('Valley : moves to → may heal each Hobbit companion', () => {
        const text =
            '**Dwelling.** **River.** When your fellowship moves to this site, you may heal each Hobbit companion.';
        expect(parseSiteAbilities(text, '11S261')).toEqual([
            expect.objectContaining({
                optional: true,
                responsePlayer: 'FREE_PEOPLE',
                trigger: { type: 'MOVES_TO' },
                effects: [
                    {
                        type: 'HEAL',
                        count: 1,
                        all: true,
                        target: [['HOBBIT', 'COMPANION']],
                    },
                ],
            }),
        ]);
    });

    it('Rohan Uplands : FORBID_ARCHERY_WOUNDS sur Uruk-hai', () => {
        const text =
            '**Plains.** During the archery phase, <symbol>urukhai</symbol> minions cannot take wounds.';
        expect(parseSiteAbilities(text, '11S257')).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'FORBID_ARCHERY_WOUNDS',
                        target: [['URUK-HAI', 'MINION']],
                    },
                ],
            }),
        ]);
    });

    it('Shores : Spot 5 Orques → PREVENT_MOVE_AGAIN (optional toaster)', () => {
        const text =
            '<keyword>River. Shadow:</keyword> Spot 5 <symbol>orc</symbol> Orcs to prevent the fellowship from moving again this turn.';
        expect(parseSiteAbilities(text, '12U191')).toEqual([
            expect.objectContaining({
                phases: ['SHADOW'],
                optional: true,
                responsePlayer: 'SHADOW',
                cost: [
                    {
                        spot: [
                            {
                                count: 5,
                                target: [['ORC', 'MINION']],
                            },
                        ],
                    },
                ],
                effects: [{ type: 'PREVENT_MOVE_AGAIN' }],
            }),
        ]);
    });
});

describe('runtime — Valley / Uplands / Shores', () => {
    it('Valley : HEAL all soigne chaque Hobbit blessé', () => {
        const abilities = parseSiteAbilities(
            'When your fellowship moves to this site, you may heal each Hobbit companion.',
            '11S261'
        ) as Ability[];
        const site = createSite({ id: '11S261', abilities });
        const frodo = createCompanion({
            instanceId: 'frodo',
            race: 'HOBBIT',
            wounds: 2,
        });
        const pippin = createCompanion({
            instanceId: 'pippin',
            race: 'HOBBIT',
            wounds: 1,
        });
        const gimli = createCompanion({
            instanceId: 'gimli',
            race: 'DWARF',
            wounds: 1,
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [frodo, pippin, gimli],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(
            applyAbilityEffect(G, site, abilities[0]!, undefined, undefined)
        ).toBe(true);
        expect(frodo.wounds).toBe(1);
        expect(pippin.wounds).toBe(0);
        expect(gimli.wounds).toBe(1);
    });

    it('Uplands : Uruk immunisé archerie ; Orque non', () => {
        const site = createSite({
            id: '11S257',
            abilities: parseSiteAbilities(
                'During the archery phase, <symbol>urukhai</symbol> minions cannot take wounds.',
                '11S257'
            ) as never,
        });
        const uruk = createMinion({
            instanceId: 'uruk-1',
            race: 'URUK-HAI',
        });
        const orc = createMinion({
            instanceId: 'orc-1',
            race: 'ORC',
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            battlefield: [uruk, orc],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1'),
            },
        });
        expect(cannotTakeArcheryWoundsFromSite(G, uruk)).toBe(true);
        expect(cannotTakeArcheryWoundsFromSite(G, orc)).toBe(false);
    });

    it('Shores : pas de projection ; toaster Spot 5 → prevent ; Passer = plus d’offre', () => {
        const abilities = parseSiteAbilities(
            '<keyword>River. Shadow:</keyword> Spot 5 <symbol>orc</symbol> Orcs to prevent the fellowship from moving again this turn.',
            '12U191'
        ) as Ability[];
        const ability = abilities[0]!;
        const site = createSite({ id: '12U191', abilities });
        const orcs = Array.from({ length: 5 }, (_, i) =>
            createMinion({
                instanceId: `orc-${i}`,
                race: 'ORC',
            })
        );
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            battlefield: orcs,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityProjectsOnto(G, site, ability, orcs[0]!)).toBe(false);
        expect(beginOptionalSitePhaseAbility(G)).toBe(true);
        expect(G.pendingSitePhaseAbility?.playerId).toBe('1');
        expect(resolvePendingSitePhaseAbility(G, '1', true)).toBe(true);
        expect(G.preventMoveAgain).toBe(true);
        expect(G.pendingSitePhaseAbility).toBeUndefined();
        expect(G.sitePhaseAbilityOfferedThisPhase).toBe(true);
        // Plus de seconde offre cette phase.
        expect(beginOptionalSitePhaseAbility(G)).toBe(false);
    });

    it('Shores : Passer ferme le toaster sans prevent', () => {
        const abilities = parseSiteAbilities(
            '<keyword>River. Shadow:</keyword> Spot 5 <symbol>orc</symbol> Orcs to prevent the fellowship from moving again this turn.',
            '12U191'
        ) as Ability[];
        const site = createSite({ id: '12U191', abilities });
        const orcs = Array.from({ length: 5 }, (_, i) =>
            createMinion({
                instanceId: `orc-${i}`,
                race: 'ORC',
            })
        );
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            battlefield: orcs,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1'),
            },
        });
        expect(beginOptionalSitePhaseAbility(G)).toBe(true);
        expect(resolvePendingSitePhaseAbility(G, '1', false)).toBe(true);
        expect(G.preventMoveAgain).toBeFalsy();
        expect(G.sitePhaseAbilityOfferedThisPhase).toBe(true);
        expect(beginOptionalSitePhaseAbility(G)).toBe(false);
    });

    it('Uplands : Legolas Vertefeuille ne peut pas cibler / activer sur Uruk seul', () => {
        const site = createSite({
            id: '11S257',
            abilities: parseSiteAbilities(
                'During the archery phase, <symbol>urukhai</symbol> minions cannot take wounds.',
                '11S257'
            ) as never,
        });
        const legolasAbility: Ability = {
            id: '1R50:0',
            phases: ['ARCHERY'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: [['MINION']],
                },
            ],
            source: 'SELF',
            omitFromArcheryTotal: true,
            text: 'Archery: Exert Legolas to wound a minion.',
        };
        const legolas = createCompanion({
            id: '1R50',
            instanceId: 'legolas',
            keywords: ['ARCHER'],
            abilities: [legolasAbility],
            vitality: 3,
        });
        const uruk = createMinion({
            id: '1C146',
            instanceId: 'uruk-1',
            race: 'URUK-HAI',
            vitality: 3,
        });
        const orc = createMinion({
            id: '1C271',
            instanceId: 'orc-1',
            race: 'ORC',
            vitality: 3,
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            battlefield: [uruk],
            archeryState: {
                step: 'ACTIONS',
                fpTotal: 0,
                shadowTotal: 0,
                fpRemainingWounds: 0,
                shadowRemainingWounds: 0,
            },
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [legolas],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(canCardTakeWound(G, uruk)).toBe(false);
        expect(getEffectDesignationCandidates(G, legolas, legolasAbility)).toEqual(
            []
        );
        expect(
            abilityHasLegalEffectTarget(G, legolas, legolasAbility)
        ).toBe(false);
        expect(
            canUseAbility(legolas, {
                G,
                ctx: { phase: 'archery' },
                playerID: '0',
            }).valid
        ).toBe(false);

        // Avec un Orque légal : Uruk hors candidats ; capacité OK.
        G.battlefield = [uruk, orc];
        const candidates = getEffectDesignationCandidates(
            G,
            legolas,
            legolasAbility
        );
        expect(candidates.map((c) => c.instanceId)).toEqual(['orc-1']);
        expect(
            abilityHasLegalEffectTarget(G, legolas, legolasAbility)
        ).toBe(true);
    });

    it('Uplands : activateAbility sur Uruk n’affaiblit pas Legolas', () => {
        const site = createSite({
            id: '11S257',
            abilities: parseSiteAbilities(
                'During the archery phase, <symbol>urukhai</symbol> minions cannot take wounds.',
                '11S257'
            ) as never,
        });
        const legolasAbility: Ability = {
            id: '1R50:0',
            phases: ['ARCHERY'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: [['MINION']],
                },
            ],
            source: 'SELF',
            omitFromArcheryTotal: true,
            text: 'Archery: Exert Legolas to wound a minion.',
        };
        const legolas = createCompanion({
            id: '1R50',
            instanceId: 'legolas',
            keywords: ['ARCHER'],
            abilities: [legolasAbility],
            vitality: 3,
        });
        const uruk = createMinion({
            id: '1C146',
            instanceId: 'uruk-1',
            race: 'URUK-HAI',
            vitality: 3,
        });
        const engine = createEngineClient({
            startPhase: 'archery',
            G: {
                currentSiteIndex: 0,
                path: [site],
                battlefield: [uruk],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [legolas],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        // Rester en ACTIONS (ne pas passer les fenêtres d’action).
        expect(engine.getG().archeryState?.step).toBe('ACTIONS');
        engine.updatePlayerID('0');
        engine.moves.activateAbility('legolas', '1R50:0', 'uruk-1');
        const after = engine.getG().players['0']?.fellowshipArea.find(
            (c) => c.instanceId === 'legolas'
        );
        expect(after?.wounds || 0).toBe(0);
        expect(
            engine.getG().battlefield.find((c) => c.instanceId === 'uruk-1')
                ?.wounds || 0
        ).toBe(0);
    });

    it('Uplands : assignArcheryWound refuse l’Uruk ; Orque OK', () => {
        const site = createSite({
            id: '11S257',
            abilities: parseSiteAbilities(
                'During the archery phase, <symbol>urukhai</symbol> minions cannot take wounds.',
                '11S257'
            ) as never,
        });
        const uruk = createMinion({
            id: '1C146',
            instanceId: 'uruk-1',
            race: 'URUK-HAI',
            vitality: 3,
        });
        const orc = createMinion({
            id: '1C271',
            instanceId: 'orc-1',
            race: 'ORC',
            vitality: 3,
        });
        const engine = createEngineClient({
            startPhase: 'archery',
            G: {
                currentSiteIndex: 0,
                path: [site],
                battlefield: [uruk, orc],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [
                            createCompanion({
                                id: '1R50',
                                keywords: ['ARCHER'],
                            }),
                        ],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        passBothActionWindows(engine);
        expect(engine.getG().archeryState?.step).toBe('SHADOW_ASSIGN');
        engine.updatePlayerID('1');
        engine.moves.assignArcheryWound('uruk-1');
        expect(
            engine.getG().battlefield.find((c) => c.instanceId === 'uruk-1')
                ?.wounds || 0
        ).toBe(0);
        engine.moves.assignArcheryWound('orc-1');
        expect(
            engine.getG().battlefield.find((c) => c.instanceId === 'orc-1')
                ?.wounds || 0
        ).toBe(1);
    });
});
