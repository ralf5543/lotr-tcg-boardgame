import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { canCardTakeWound } from '../logic/sites';
import type { CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const TEXT =
    'While you can spot a mounted <symbol>raider</symbol> Man, <symbol>raider</symbol> Men cannot take wounds (except during skirmishes).';

describe('Line of Defense (8C63)', () => {
    it('parse : WHILE spot pillard monté → FORBID_WOUNDS hors combat', () => {
        const abs = parseAbilities(TEXT, 'Line of Defense', '8C63') || [];
        expect(abs).toHaveLength(1);
        expect(abs[0]).toMatchObject({
            trigger: {
                type: 'WHILE',
                spot: [
                    {
                        count: 1,
                        target: [['RAIDER', 'MAN']],
                        bearing: [['MOUNT']],
                    },
                ],
            },
            effects: [
                {
                    type: 'FORBID_WOUNDS',
                    target: [['RAIDER', 'MAN']],
                    exceptDuringSkirmishes: true,
                },
            ],
        });
    });

    it('cartes.json aligné', () => {
        const card = getCardById('8C63')!;
        expect(card.abilities).toHaveLength(1);
        expect(card.abilities?.[0]).toMatchObject({
            effects: [
                {
                    type: 'FORBID_WOUNDS',
                    exceptDuringSkirmishes: true,
                },
            ],
        });
    });

    it('refuse les blessures hors combat si un pillard est monté', () => {
        const line = {
            ...getCardById('8C63')!,
            instanceId: 'line',
        } as CardState;
        const mount = {
            ...getCardById('5C73')!,
            instanceId: 'mumak',
        };
        const mounted = createMinion({
            id: '5C76',
            instanceId: 'traveler',
            culture: 'RAIDER',
            race: 'MAN',
            keywords: ['SOUTHRON'],
            attachments: [mount],
        });
        const unmounted = createMinion({
            id: '4C252',
            instanceId: 'scout',
            culture: 'RAIDER',
            race: 'MAN',
            keywords: ['SOUTHRON'],
        });
        const ranger = createCompanion({
            id: '7C116',
            instanceId: 'ranger',
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [ranger],
                }),
                '1': createPlayerState('1', {
                    supportArea: [line],
                }),
            },
            battlefield: [mounted, unmounted],
        });
        expect(canCardTakeWound(G, mounted)).toBe(false);
        expect(canCardTakeWound(G, unmounted)).toBe(false);
        expect(canCardTakeWound(G, ranger)).toBe(true);
    });

    it('autorise les blessures pendant un combat (affecté)', () => {
        const line = {
            ...getCardById('8C63')!,
            instanceId: 'line',
        } as CardState;
        const mount = {
            ...getCardById('5C73')!,
            instanceId: 'mumak',
        };
        const mounted = createMinion({
            id: '5C76',
            instanceId: 'traveler',
            culture: 'RAIDER',
            race: 'MAN',
            keywords: ['SOUTHRON'],
            attachments: [mount],
        });
        const ranger = createCompanion({
            id: '7C116',
            instanceId: 'ranger',
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [ranger],
                }),
                '1': createPlayerState('1', {
                    supportArea: [line],
                }),
            },
            battlefield: [mounted],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'ranger',
                    minionIds: ['traveler'],
                },
            ],
            activeSkirmishId: 'sk-1',
        });
        expect(canCardTakeWound(G, mounted)).toBe(true);
    });

    it('sans monture : pas d’immunité', () => {
        const line = {
            ...getCardById('8C63')!,
            instanceId: 'line',
        } as CardState;
        const scout = createMinion({
            id: '4C252',
            instanceId: 'scout',
            culture: 'RAIDER',
            race: 'MAN',
            keywords: ['SOUTHRON'],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    supportArea: [line],
                }),
            },
            battlefield: [scout],
        });
        expect(canCardTakeWound(G, scout)).toBe(true);
    });
});
