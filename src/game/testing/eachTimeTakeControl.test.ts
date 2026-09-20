import { describe, expect, it } from 'vitest';
import {
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import { tryOpenFellowshipMoves } from '../engine/responseWindow';

const takeControlOnMove: Ability = {
    id: '4C21:0',
    phases: ['RESPONSE'],
    trigger: { type: 'FELLOWSHIP_MOVES' },
    optional: true,
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

describe('each time take control — une fois par événement', () => {
    it('après activation, la même capacité n’est plus éligible', () => {
        const band = createMinion({
            id: '4C21',
            instanceId: 'band',
            culture: 'DUNLAND',
            race: 'MAN',
            abilities: [takeControlOnMove],
            actionPhases: ['RESPONSE'],
        });
        const other = createMinion({
            id: '4C14',
            instanceId: 'other',
            culture: 'DUNLAND',
            race: 'MAN',
        });
        const G = createGameState({
            fpPlayerId: '0',
            path: Array.from({ length: 9 }, (_, i) =>
                i < 3
                    ? createSite({
                          id: `s${i + 1}`,
                          siteNumber: i + 1,
                          ownerId: '0',
                      })
                    : null
            ),
            currentSiteIndex: 2,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 2,
                }),
            },
            battlefield: [band, other],
        });

        expect(tryOpenFellowshipMoves(G)).toBe('WAITING');
        expect(G.responseWindow?.activePlayerId).toBe('1');
        expect(G.statusMessage).toMatch(/Réponse/i);

        G.responseWindow!.usedResponseKeys = ['band::4C21:0'];
        const after = canUseAbility(band, {
            G,
            ctx: { phase: 'fellowship', currentPlayer: '1' },
            playerID: '1',
        });
        expect(after.valid).toBe(false);
    });
});
