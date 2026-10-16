import { describe, expect, it } from 'vitest';
import { formatDesignationPrompt } from '../engine/abilities/designation';
import type { Ability } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const MERE_ABILITY: Ability = {
    id: '11U246:0:site-play-next',
    phases: ['REGROUP'],
    cost: [
        {
            exert: [
                {
                    count: 1,
                    target: [['Gollum'], ['Sméagol']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [{ type: 'PLAY_NEXT_SITE', from: 'SITES_DECK' }],
    source: 'SELF',
    text: "Regroup: Exert your Gollum or your Sméagol to play the fellowship's next site.",
};

describe('Mere of Dead Faces — PLAY_NEXT_SITE', () => {
    it('toaster : votre Gollum ou votre Sméagol', () => {
        expect(formatDesignationPrompt(MERE_ABILITY, 'cost')).toBe(
            'Choisissez votre Gollum ou votre Sméagol.'
        );
    });

    it('coût + site : affaiblit Gollum et remplace le prochain site', () => {
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum-1',
            title: 'Gollum',
            culture: 'GOLLUM',
            vitality: 4,
            strength: 5,
        });
        const mere = {
            ...createSite({
                id: '11U246',
                instanceId: 'mere-1',
                name: 'Mere of Dead Faces',
                siteNumber: 4,
                ownerId: '1',
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [MERE_ABILITY],
            actionPhases: ['REGROUP'] as const,
        };
        const oldNext = createSite({
            id: '11S231',
            instanceId: 'old-next',
            name: 'Caras Galadhon',
            siteNumber: 5,
            ownerId: '1',
        });
        const deckSite = createSite({
            id: '11S241',
            instanceId: 'deck-1',
            name: 'Fortress of Orthanc',
        });

        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({
                id: `path-${i}`,
                siteNumber: i + 1,
                ownerId: i === 0 ? '0' : '1',
            })
        );
        path[3] = mere;
        path[4] = oldNext;

        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                currentSiteIndex: 3,
                path,
                battlefield: [gollum],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 3,
                        sitesDeck: [],
                    }),
                    '1': createPlayerState('1', {
                        currentSiteIndex: 3,
                        sitesDeck: [deckSite],
                    }),
                },
            },
        });

        // Regroup : FP passe → priorité Ombre.
        engine.moves.passActionWindow();
        engine.updatePlayerID('1');
        engine.moves.activateAbility(
            'mere-1',
            MERE_ABILITY.id,
            'gollum-1',
            undefined,
            'deck-1'
        );

        const G = engine.getG();
        expect(G.battlefield[0]?.wounds).toBe(1);
        expect(G.path[4]?.id).toBe('11S241');
        expect(G.players['1']?.sitesDeck.some((s) => s.id === '11S231')).toBe(
            true
        );
    });

    it('coût seul sans site : pas d’affaiblissement', () => {
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum-1',
            title: 'Gollum',
            culture: 'GOLLUM',
            vitality: 4,
            strength: 5,
        });
        const mere = {
            ...createSite({
                id: '11U246',
                instanceId: 'mere-1',
                siteNumber: 4,
                ownerId: '1',
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [MERE_ABILITY],
            actionPhases: ['REGROUP'] as const,
        };
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `path-${i}`, siteNumber: i + 1 })
        );
        path[3] = mere;

        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                currentSiteIndex: 3,
                path,
                battlefield: [gollum],
                players: {
                    '0': createPlayerState('0', { currentSiteIndex: 3 }),
                    '1': createPlayerState('1', {
                        currentSiteIndex: 3,
                        sitesDeck: [
                            createSite({
                                id: '11S241',
                                instanceId: 'deck-1',
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.passActionWindow();
        engine.updatePlayerID('1');
        engine.moves.activateAbility('mere-1', MERE_ABILITY.id, 'gollum-1');
        expect(engine.getG().battlefield[0]?.wounds || 0).toBe(0);
        expect(engine.getG().path[4]?.id).not.toBe('11S241');
    });
});
