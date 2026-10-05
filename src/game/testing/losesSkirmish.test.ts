import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { tryOpenLosesSkirmish } from '../engine/responseWindow';
import { canUseAbility } from '../engine/canUseAbility';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { tokenCountOnCard } from '../logic/cultureTokens';
import type { Ability } from '../types';

const SECRET_FOLK_LOSES: Ability = {
    id: '4U34:0',
    phases: ['RESPONSE'],
    optional: true,
    trigger: {
        type: 'LOSES_SKIRMISH',
        loser: [['COMPANION'], ['ALLY']],
        involving: [['DUNLAND', 'MAN']],
    },
    cost: [],
    effects: [
        {
            type: 'PLACE_CULTURE_TOKEN',
            culture: 'DUNLAND',
            count: 1,
            target: 'SELF',
        },
    ],
    source: 'SELF',
    text: 'Each time a companion or ally loses a skirmish involving a dunland Man, you may place a dunland token on this card.',
};

describe('responseWindow / LOSES_SKIRMISH', () => {
    it('compagnon perd vs dunland : fenêtre puis jeton sur Secret Folk', () => {
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry',
            strength: 2,
            vitality: 4,
        });
        const hillman = createMinion({
            id: 'hillman',
            instanceId: 'hillman',
            culture: 'DUNLAND',
            race: 'MAN',
            strength: 6,
            vitality: 2,
        });
        const secretFolk = createCard({
            id: '4U34',
            instanceId: '4U34',
            title: 'Secret Folk',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'DUNLAND',
            actionPhases: ['RESPONSE'],
            abilities: [SECRET_FOLK_LOSES],
        });

        const G = createGameState({
            fpPlayerId: '0',
            skirmishes: [
                {
                    id: 'sk-merry',
                    companionId: 'merry',
                    minionIds: ['hillman'],
                    resolved: true,
                },
            ],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [merry] }),
                '1': createPlayerState('1', { supportArea: [secretFolk] }),
            },
            battlefield: [hillman],
            pendingLosesSkirmish: {
                loserIds: ['merry'],
                skirmishId: 'sk-merry',
            },
        });

        expect(tryOpenLosesSkirmish(G)).toBe('WAITING');
        expect(G.pendingEvent?.type).toBe('LOSES_SKIRMISH');
        expect(G.responseWindow?.activePlayerId).toBe('1');
        expect(
            canUseAbility(secretFolk, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '1',
            }).valid
        ).toBe(true);

        expect(applyAbilityEffect(G, secretFolk, SECRET_FOLK_LOSES)).toBe(
            true
        );
        expect(tokenCountOnCard(secretFolk, 'DUNLAND')).toBe(1);
    });

    it('sans dunland impliqué : pas de réponse Secret Folk', () => {
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry',
        });
        const uruk = createMinion({
            id: 'uruk',
            instanceId: 'uruk',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
        });
        const secretFolk = createCard({
            id: '4U34',
            instanceId: '4U34',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'DUNLAND',
            actionPhases: ['RESPONSE'],
            abilities: [SECRET_FOLK_LOSES],
        });

        const G = createGameState({
            skirmishes: [
                {
                    id: 'sk-merry',
                    companionId: 'merry',
                    minionIds: ['uruk'],
                    resolved: true,
                },
            ],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [merry] }),
                '1': createPlayerState('1', { supportArea: [secretFolk] }),
            },
            battlefield: [uruk],
            pendingLosesSkirmish: {
                loserIds: ['merry'],
                skirmishId: 'sk-merry',
            },
        });

        expect(tryOpenLosesSkirmish(G)).toBe('APPLIED');
        expect(G.responseWindow).toBeUndefined();
    });
});
