import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    getCostDesignationCandidates,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import { canCardTakeWound } from '../logic/sites';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Ranger.</keyword> <br><keyword>Fellowship:</keyword> Play a <symbol>rohan</symbol> Man to heal Faramir. <br><keyword>Skirmish:</keyword> Exert Faramir to make an unbound Hobbit strength +2. <br><keyword>Skirmish:</keyword> Exert Gandalf to prevent all wounds to Faramir.';

describe('Faramir Wizard’s Pupil 7R91', () => {
    it('trois capacités : jouer Homme Rohan → soin ; force Hobbit ; empêcher blessures', () => {
        expect(parseAbilities(CSV_TEXT, 'Faramir', '7R91')).toHaveLength(3);
        const card = getCardById('7R91');
        expect(card?.abilities).toHaveLength(3);
        expect(card?.abilities?.[0]?.effects?.[0]?.type).toBe('PLAY_FROM_HAND');
        expect(card?.abilities?.[2]?.effects?.[0]).toEqual(
            expect.objectContaining({
                type: 'FORBID_WOUNDS',
                target: 'SELF',
                expiresAtPhase: 'SKIRMISH',
            })
        );
    });

    it('Communauté : jouer Homme Rohan depuis la main → soigne Faramir', () => {
        const faramir = {
            ...getCardById('7R91')!,
            instanceId: 'faramir',
            wounds: 1,
        };
        const ability = (faramir.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'PLAY_FROM_HAND')
        ) as Ability;
        const rider = {
            ...getCardById('4C265')!,
            instanceId: 'rider',
            twilightCost: 0,
        };
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [faramir],
                    hand: [rider],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityHasLegalEffectTarget(G, faramir, ability)).toBe(true);
        expect(
            getEffectDesignationCandidates(G, faramir, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['rider']);
        expect(applyAbilityEffect(G, faramir, ability, ['rider'])).toBe(true);
        expect(faramir.wounds).toBe(0);
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.instanceId === 'rider')
        ).toBe(true);
    });

    it('Combat : affaiblir Gandalf → Faramir ne prend plus de blessures', () => {
        const faramir = {
            ...getCardById('7R91')!,
            instanceId: 'faramir',
            wounds: 0,
        };
        const gandalf = createCompanion({
            id: '8R15',
            instanceId: 'gandalf',
            title: 'Gandalf',
            culture: 'GANDALF',
            race: 'WIZARD',
            vitality: 4,
            wounds: 0,
            i18n: { en: { title: 'Gandalf' }, fr: { title: 'Gandalf' } },
        });
        const ability = (faramir.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'FORBID_WOUNDS')
        ) as Ability;
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [faramir, gandalf],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(
            getCostDesignationCandidates(G, faramir, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['gandalf']);
        expect(payAbilityCost(G, faramir, ability.cost, 'gandalf')).toBe(true);
        expect(applyAbilityEffect(G, faramir, ability)).toBe(true);
        expect(faramir.forbidWoundsUntil).toBe('SKIRMISH');
        expect(canCardTakeWound(G, faramir)).toBe(false);
        expect(canCardTakeWound(G, gandalf)).toBe(true);
    });

    it('preset DEV', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_FARAMIR_PUPIL');
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '7R91')
        ).toBe(true);
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '8R15')
        ).toBe(true);
        expect(G.players['0']!.hand?.[0]?.id).toBe('4C265');
    });
});
