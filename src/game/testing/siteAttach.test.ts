import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import {
    attachesToSite,
    canAttachToCharacter,
} from '../engine/canPlayCard';
import { replacePathSiteFromDeck } from '../logic/sites';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Site attachments', () => {
    it('attachesToSite détecte Plays on a site', () => {
        const snows = getCardById('1C138');
        const strongArms = getCardById('7U252');
        expect(snows && attachesToSite(snows)).toBe(true);
        expect(strongArms && attachesToSite(strongArms)).toBe(true);
    });

    it('canAttachToCharacter accepte un site pour Neiges / Strong Arms', () => {
        const snows = getCardById('1C138')!;
        const strongArms = getCardById('7U252')!;
        const site = createSite({
            id: 'site-a',
            siteNumber: 2,
            ownerId: '0',
        });
        expect(canAttachToCharacter(snows, site)).toBe(true);
        expect(canAttachToCharacter(strongArms, site)).toBe(true);
    });

    it('refuse un second exemplaire du même id sur le site', () => {
        const snows = getCardById('1C138')!;
        const site = createSite({
            id: 'site-a',
            siteNumber: 2,
            ownerId: '0',
            attachments: [{ ...snows, instanceId: 'already' }],
        });
        expect(canAttachToCharacter(snows, site)).toBe(false);
    });

    it('Strong Arms (FP) uniquement sur un site que l’on possède', () => {
        const strongArms = getCardById('7U252')!;
        const mine = createSite({
            id: 'mine',
            siteNumber: 1,
            ownerId: '0',
        });
        const theirs = createSite({
            id: 'theirs',
            siteNumber: 2,
            ownerId: '1',
        });
        expect(canAttachToCharacter(strongArms, mine, '0')).toBe(true);
        expect(canAttachToCharacter(strongArms, theirs, '0')).toBe(false);
    });

    it('Neiges (Ombre) peut aller sur un site adverse', () => {
        const snows = getCardById('1C138')!;
        const fpSite = createSite({
            id: 'fp-site',
            siteNumber: 1,
            ownerId: '0',
        });
        expect(canAttachToCharacter(snows, fpSite, '1')).toBe(true);
    });

    it('replace défausse les conditions du site (pas de transfert)', () => {
        const snows = {
            ...getCardById('1C138')!,
            instanceId: 'snows-1',
            kind: 'SHADOW' as const,
        };
        const oldSite = createSite({
            id: 'old',
            instanceId: 'old',
            siteNumber: 1,
            ownerId: '0',
            attachments: [snows],
        });
        const newSite = createSite({
            id: 'new',
            instanceId: 'new',
            ownerId: '0',
        });
        const G = createGameState({
            path: [oldSite, null, null, null, null, null, null, null, null],
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    sitesDeck: [newSite],
                    discard: [],
                }),
                '1': createPlayerState('1', {
                    discard: [],
                }),
            },
        });

        const ok = replacePathSiteFromDeck(G, '0', 0, 'new');
        expect(ok).toBe(true);
        expect(G.path[0]?.id).toBe('new');
        expect(G.path[0]?.attachments || []).toHaveLength(0);
        expect(
            G.players['1']?.discard?.some((c) => c.instanceId === 'snows-1')
        ).toBe(true);
    });
});
