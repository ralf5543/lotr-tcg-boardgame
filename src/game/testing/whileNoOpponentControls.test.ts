import { describe, expect, it } from 'vitest';
import { getWhileStrengthBonus } from '../logic/stats/mechanics/whileModifier';
import {
    createCard,
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const whileAbility: Ability = {
    id: '15R141:1',
    phases: [],
    trigger: { type: 'WHILE', noOpponentControlsSite: true },
    cost: [],
    effects: [
        {
            type: 'MODIFY_STAT',
            stat: 'STRENGTH',
            value: 1,
            target: 'BEARER',
        },
    ],
    source: 'ATTACHMENT',
};

describe('While no opponent controls a site', () => {
    it('force +1 si l’adversaire ne contrôle aucun site', () => {
        const shield = createCard({
            id: '15R141',
            instanceId: 'shield',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            abilities: [whileAbility],
        });
        const eowyn = createCompanion({
            id: '4C287',
            instanceId: 'eowyn',
            strength: 6,
            attachments: [shield],
        });
        const G = createGameState({
            fpPlayerId: '0',
            path: [
                createSite({
                    id: 's1',
                    siteNumber: 1,
                    ownerId: '0',
                }),
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [eowyn],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getWhileStrengthBonus(G, eowyn)).toBe(1);
    });

    it('pas de bonus si l’adversaire contrôle un site', () => {
        const shield = createCard({
            id: '15R141',
            instanceId: 'shield',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            abilities: [whileAbility],
        });
        const eowyn = createCompanion({
            id: '4C287',
            instanceId: 'eowyn',
            strength: 6,
            attachments: [shield],
        });
        const G = createGameState({
            fpPlayerId: '0',
            path: [
                createSite({
                    id: 's1',
                    siteNumber: 1,
                    ownerId: '0',
                    controlledBy: '1',
                }),
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [eowyn],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getWhileStrengthBonus(G, eowyn)).toBe(0);
    });
});
