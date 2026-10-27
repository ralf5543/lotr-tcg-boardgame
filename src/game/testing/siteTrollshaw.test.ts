/**
 * Trollshaw Forest (11S260) : « Each time you play an artifact or
 * possession on your companion, you may draw a card. »
 * Réponse optionnelle du site courant (toaster, pas de bulle).
 */

import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createCompanion,
    createSite,
    createCard,
} from './createGameState';
import {
    maybeOfferSiteYouPlayResponse,
    afterCardPlayed,
} from '../engine/abilities/eachTimeYouPlay';
import {
    acceptPendingWhenPlayed,
    declinePendingWhenPlayed,
} from '../engine/abilities/whenPlayed';

const TEXT =
    '<keyword>Forest.</keyword> Each time you play an artifact or possession on your companion, you may draw a card.';

const trollshaw = () =>
    createSite({
        id: '11S260',
        name: 'Trollshaw Forest',
        abilities: parseSiteAbilities(TEXT, '11S260') as never,
    });

function stateOn(board: ReturnType<typeof createSite>, opts: {
    deckCount?: number;
    fellowship?: ReturnType<typeof createCompanion>[];
}) {
    const fp = createPlayerState('0', {
        deck: Array.from({ length: opts.deckCount ?? 4 }, (_, i) => ({
            id: `deck-${i}`,
            instanceId: `deck-${i}`,
            name: `Deck ${i}`,
        })) as never,
        fellowshipArea: opts.fellowship || [],
    });
    const sh = createPlayerState('1');
    const g = createGameState({ players: { '0': fp, '1': sh } });
    g.path = [board, createSite({ id: '11S228', name: 'Anduin Confluence' })];
    fp.currentSiteIndex = 0;
    return g;
}

const companionWith = (attachment: ReturnType<typeof createCard>) =>
    createCompanion({
        instanceId: 'aragorn-host',
        attachments: [attachment],
    });

describe('parse Trollshaw', () => {
    it('YOU_PLAY optionnel, played ARTIFACT/POSSESSION, onCompanion, DRAW 1', () => {
        const abs = parseSiteAbilities(TEXT, '11S260') as unknown as Array<{
            optional?: boolean;
            trigger?: { type?: string; played?: string[][]; onCompanion?: boolean };
            effects?: Array<{ type: string; count?: number }>;
        }>;
        expect(abs).toHaveLength(1);
        expect(abs[0].optional).toBe(true);
        expect(abs[0].trigger).toMatchObject({
            type: 'YOU_PLAY',
            played: [['ARTIFACT'], ['POSSESSION']],
            onCompanion: true,
        });
        expect(abs[0].effects).toEqual([{ type: 'DRAW', count: 1 }]);
    });
});

describe('Trollshaw : proposition', () => {
    it('possession jouée sur un compagnon → fenêtre offerte ; Activer pioche 1', () => {
        const sword = createCard({
            id: 'sword', instanceId: 'sword-1', type: 'POSSESSION', kind: 'FREE_PEOPLE',
        });
        const g = stateOn(trollshaw(), {
            fellowship: [companionWith(sword)],
        });
        maybeOfferSiteYouPlayResponse(g, sword, { playerId: '0', phase: 'fellowship' });
        expect(g.pendingWhenPlayed?.fromSite).toBe(true);
        expect(g.pendingWhenPlayed?.playerId).toBe('0');
        const handBefore = g.players['0'].hand?.length ?? 0;
        expect(acceptPendingWhenPlayed(g, '0')).toBe(true);
        expect((g.players['0'].hand?.length ?? 0) - handBefore).toBe(1);
        expect(g.pendingWhenPlayed).toBeUndefined();
    });

    it('Passer ne pioche pas et ferme la fenêtre', () => {
        const sword = createCard({
            id: 'sword', instanceId: 'sword-2', type: 'POSSESSION', kind: 'FREE_PEOPLE',
        });
        const g = stateOn(trollshaw(), {
            fellowship: [companionWith(sword)],
        });
        maybeOfferSiteYouPlayResponse(g, sword, { playerId: '0', phase: 'fellowship' });
        const handBefore = g.players['0'].hand?.length ?? 0;
        expect(declinePendingWhenPlayed(g, '0')).toBe(true);
        expect(g.players['0'].hand?.length ?? 0).toBe(handBefore);
    });

    it('possession NON attachée (aire de soutien) → pas de fenêtre', () => {
        const horn = createCard({
            id: 'horn', instanceId: 'horn-1', type: 'POSSESSION', kind: 'FREE_PEOPLE',
        });
        const g = stateOn(trollshaw(), {
            fellowship: [createCompanion({ instanceId: 'frodo-host' })],
        });
        g.players['0'].supportArea = [horn];
        maybeOfferSiteYouPlayResponse(g, horn, { playerId: '0', phase: 'fellowship' });
        expect(g.pendingWhenPlayed).toBeUndefined();
    });

    it('événement joué → pas de fenêtre', () => {
        const event = createCard({
            id: 'event', instanceId: 'event-1', type: 'EVENT', kind: 'FREE_PEOPLE',
        });
        const g = stateOn(trollshaw(), {
            fellowship: [companionWith(event as never)],
        });
        maybeOfferSiteYouPlayResponse(g, event, { playerId: '0', phase: 'fellowship' });
        expect(g.pendingWhenPlayed).toBeUndefined();
    });

    it('pioche vide → pas de fenêtre', () => {
        const sword = createCard({
            id: 'sword', instanceId: 'sword-3', type: 'POSSESSION', kind: 'FREE_PEOPLE',
        });
        const g = stateOn(trollshaw(), {
            deckCount: 0,
            fellowship: [companionWith(sword)],
        });
        maybeOfferSiteYouPlayResponse(g, sword, { playerId: '0', phase: 'fellowship' });
        expect(g.pendingWhenPlayed).toBeUndefined();
    });

    it('après le jeu (afterCardPlayed), la fenêtre s’ouvre aussi', () => {
        const sword = createCard({
            id: 'sword', instanceId: 'sword-4', type: 'POSSESSION', kind: 'FREE_PEOPLE',
        });
        const g = stateOn(trollshaw(), {
            fellowship: [companionWith(sword)],
        });
        afterCardPlayed(g, sword, { playerId: '0', phase: 'fellowship' });
        expect(g.pendingWhenPlayed?.fromSite).toBe(true);
    });
});
