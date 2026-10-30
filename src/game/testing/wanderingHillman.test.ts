import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { canPayAbilityCost, payAbilityCost } from '../engine/abilities/payAbilityCost';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { getEffectiveStrength } from '../../utils/cardStats';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const CSV_TEXT =
    'To play, spot a <symbol>men</symbol> Man. While you can spot a companion of strength 10 or more, this minion is strength +3. <br><keyword>Maneuver:</keyword> Remove 2 burdens or 2 threats to control a site.';

describe('Wandering Hillman 15U94', () => {
    it('analyse CSV : While force ≥10 + deux Manœuvre (fardeaux / menaces)', () => {
        const parsed = parseAbilities(
            CSV_TEXT,
            'Wandering Hillman',
            '15U94'
        );
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        spotMinStrength: {
                            target: [['COMPANION']],
                            min: 10,
                        },
                    },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 3,
                            target: 'SELF',
                        }),
                    ],
                }),
                expect.objectContaining({
                    phases: ['MANEUVER'],
                    cost: [{ removeBurdens: 2 }],
                    effects: [{ type: 'TAKE_CONTROL_SITE' }],
                }),
                expect.objectContaining({
                    phases: ['MANEUVER'],
                    cost: [{ removeThreats: 2 }],
                    effects: [{ type: 'TAKE_CONTROL_SITE' }],
                }),
            ])
        );
        const card = getCardById('15U94');
        expect(
            card?.abilities?.some(
                (ab) =>
                    ab.trigger?.type === 'WHILE' &&
                    ab.trigger.spotMinStrength?.min === 10
            )
        ).toBe(true);
        expect(
            card?.abilities?.filter(
                (ab) =>
                    ab.phases?.includes('MANEUVER') &&
                    (ab.effects || []).some(
                        (e) => e.type === 'TAKE_CONTROL_SITE'
                    )
            )
        ).toHaveLength(2);
    });

    it('While : +3 si un compagnon a force ≥10', () => {
        const hillman = createMinion({
            id: '15U94',
            instanceId: 'hill',
            strength: 8,
            culture: 'MEN',
            abilities: getCardById('15U94')?.abilities,
        });
        const weak = createCompanion({
            id: '1C290',
            instanceId: 'frodo',
            strength: 3,
        });
        const strong = createCompanion({
            id: '6R30',
            instanceId: 'gandalf',
            strength: 10,
        });

        const alone = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [weak],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [hillman],
        });
        expect(getEffectiveStrength(hillman, alone)).toBe(8);

        const withStrong = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [weak, strong],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [hillman],
        });
        expect(getEffectiveStrength(hillman, withStrong)).toBe(11);
    });

    it('Manœuvre : retirer 2 fardeaux → contrôle un site', () => {
        const hillman = createMinion({
            id: '15U94',
            instanceId: 'hill',
            abilities: getCardById('15U94')?.abilities,
        });
        const ability = (hillman.abilities || []).find(
            (ab) => ab.cost?.[0]?.removeBurdens === 2
        ) as Ability;
        expect(ability).toBeTruthy();

        const path = Array.from({ length: 9 }, (_, i) =>
            i < 2
                ? createSite({
                      id: `site-${i + 1}`,
                      instanceId: `site-${i + 1}`,
                      siteNumber: i + 1,
                      ownerId: '0',
                  })
                : null
        );
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 1,
            path,
            players: {
                '0': createPlayerState('0', {
                    burdens: 2,
                    threats: 0,
                    currentSiteIndex: 1,
                }),
                '1': createPlayerState('1', { currentSiteIndex: 1 }),
            },
            battlefield: [hillman],
        });

        expect(canPayAbilityCost(G, hillman, ability.cost)).toBe(true);
        expect(abilityHasLegalEffectTarget(G, hillman, ability)).toBe(true);
        expect(payAbilityCost(G, hillman, ability.cost)).toBe(true);
        expect(G.players['0']!.burdens).toBe(0);
        expect(applyAbilityEffect(G, hillman, ability)).toBe(true);
        expect(G.path[0]?.controlledBy).toBe('1');
    });

    it('preset DEV', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_HILLMAN');
        expect(G.battlefield[0]?.id).toBe('15U94');
        expect(G.players['0']!.burdens).toBe(2);
        expect(G.players['0']!.threats).toBe(2);
    });
});
