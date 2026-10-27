/**
 * Pinnacle of Zirakzigil (11S255) : début de fellowship —
 * affaiblir 3 compagnons distincts pour jouer un Wizard depuis
 * la pile de mort.
 */

import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createCompanion,
    createSite,
} from './createGameState';
import {
    findOptionalSiteStartAbility,
    beginOptionalSiteStartAbility,
} from '../logic/siteStartAbility';
import {
    getDeckOrDiscardPlayCandidates,
    playCardFromDeckOrDiscard,
} from '../logic/playFromOutOfPlay';

const TEXT =
    'At the start of your fellowship phase, you may exert 3 companions to play a Wizard from your dead pile.';

const pinnacle = () =>
    createSite({
        id: '11S255',
        name: 'Pinnacle of Zirakzigil',
        abilities: parseSiteAbilities(TEXT, '11S255') as never,
    });

const wizard = (id: string) =>
    createCompanion({ instanceId: id, id: '1R72', name: 'Gandalf' }) as ReturnType<
        typeof createCompanion
    > & { race?: string; isDead?: boolean };

function stateOn(board: ReturnType<typeof createSite>, opts: {
    dead?: ReturnType<typeof wizard>[];
    fellowship?: ReturnType<typeof createCompanion>[];
}) {
    const fp = createPlayerState('0', {
        deadPile: opts.dead || [],
        fellowshipArea: opts.fellowship || [],
    });
    const sh = createPlayerState('1');
    const g = createGameState({ players: { '0': fp, '1': sh } });
    g.path = [board, createSite({ id: '11S228', name: 'Anduin Confluence' })];
    fp.currentSiteIndex = 0;
    return g;
}

const trio = () => [
    createCompanion({ instanceId: 'aragorn' }),
    createCompanion({ instanceId: 'legolas' }),
    createCompanion({ instanceId: 'gimli' }),
];

describe('parse Pinnacle', () => {
    it('exert 3 compagnons distincts → PLAY_FROM pile de mort (WIZARD)', () => {
        const abs = parseSiteAbilities(TEXT, '11S255') as unknown as Array<{
            optional?: boolean;
            phases?: string[];
            cost?: Array<{ exert?: Array<{ count: number; distinctTargets?: boolean }> }>;
            effects?: Array<{ type: string; from?: string; target?: string[][] }>;
        }>;
        expect(abs).toHaveLength(1);
        expect(abs[0].optional).toBe(true);
        expect(abs[0].phases).toEqual(['START_OF_FELLOWSHIP']);
        expect(abs[0].cost?.[0].exert?.[0].count).toBe(3);
        expect(abs[0].cost?.[0].exert?.[0].distinctTargets).toBe(true);
        expect(abs[0].effects?.[0]).toMatchObject({
            type: 'PLAY_FROM_DECK_OR_DISCARD',
            from: 'DEAD_PILE',
            target: [['WIZARD']],
        });
    });
});

describe('Pinnacle : proposition', () => {
    it('Wizard mort + 3 compagnons → capacité trouvée et fenêtre ouverte', () => {
        const dead = wizard('gandalf-dead');
        (dead as { race?: string }).race = 'WIZARD';
        const g = stateOn(pinnacle(), { dead: [dead], fellowship: trio() });
        expect(findOptionalSiteStartAbility(g, 'startOfFellowship')).not.toBeNull();
        expect(beginOptionalSiteStartAbility(g, 'startOfFellowship')).toBe(true);
        expect(g.pendingSiteStartAbility?.abilityId).toContain('site-start-fp');
    });

    it('pas de Wizard dans la pile de mort → pas de fenêtre', () => {
        const g = stateOn(pinnacle(), { dead: [], fellowship: trio() });
        expect(findOptionalSiteStartAbility(g, 'startOfFellowship')).toBeNull();
    });

    it('seulement 2 compagnons → coût impayable, pas de fenêtre', () => {
        const dead = wizard('gandalf-dead2');
        (dead as { race?: string }).race = 'WIZARD';
        const g = stateOn(pinnacle(), {
            dead: [dead],
            fellowship: trio().slice(0, 2),
        });
        expect(findOptionalSiteStartAbility(g, 'startOfFellowship')).toBeNull();
    });
});

describe('Pinnacle : vraies cartes (régression unicité)', () => {
    it('Gandalf unique dans la pile de mort est un candidat légal', async () => {
        const { getCardById } = await import('../cardsData');
        const realCard = (id: string, instanceId: string) => {
            const card = getCardById(id);
            if (!card) throw new Error(`Carte introuvable : ${id}`);
            return { ...card, instanceId };
        };
        const realSite = getCardById('11S255');
        if (!realSite) throw new Error('Site introuvable : 11S255');
        const site = createSite({
            id: '11S255',
            name: 'Pinnacle of Zirakzigil',
            abilities: realSite.abilities as never,
        });
        const fp = createPlayerState('0', {
            deadPile: [realCard('1R72', 'gandalf-mort')],
            fellowshipArea: [
                realCard('2C102', 'frodon'),
                realCard('1R89', 'aragorn'),
                realCard('1R13', 'gimli'),
                realCard('1C311', 'sam'),
                realCard('11S146', 'eowyn'),
            ] as never,
        });
        const sh = createPlayerState('1');
        const g = createGameState({ players: { '0': fp, '1': sh } });
        g.path = [
            site,
            createSite({ id: '11S228', name: 'Anduin Confluence' }),
        ];
        fp.currentSiteIndex = 0;

        // Régression : canPlayCard refusait Gandalf au motif qu’un unique
        // « Gandalf » est dans la pile de mort — c’est lui-même.
        expect(findOptionalSiteStartAbility(g, 'startOfFellowship')).not.toBeNull();
        expect(beginOptionalSiteStartAbility(g, 'startOfFellowship')).toBe(true);
        expect(g.pendingSiteStartAbility?.playerId).toBe('0');
        const candidates = getDeckOrDiscardPlayCandidates(
            g,
            '0',
            [['WIZARD']],
            'fellowship',
            null,
            'DEAD_PILE'
        );
        expect(candidates.map((c) => c.id)).toEqual(['1R72']);
    });
});

describe('Pinnacle : jeu depuis la pile de mort', () => {
    it('candidats filtrés WIZARD ; le jeu déplace la carte en communauté et la « ressuscite »', () => {
        const dead = wizard('gandalf-dead3');
        (dead as { race?: string }).race = 'WIZARD';
        (dead as { wounds: number }).wounds = 3;
        (dead as { isDead?: boolean }).isDead = true;
        const g = stateOn(pinnacle(), { dead: [dead], fellowship: trio() });

        const candidates = getDeckOrDiscardPlayCandidates(
            g,
            '0',
            [['WIZARD']],
            'fellowship',
            null,
            'DEAD_PILE'
        );
        expect(candidates.map((c) => c.instanceId)).toEqual(['gandalf-dead3']);

        const played = playCardFromDeckOrDiscard(
            g,
            '0',
            'gandalf-dead3',
            [['WIZARD']],
            'fellowship',
            null,
            'DEAD_PILE'
        );
        expect(played).not.toBeNull();
        expect(g.players['0'].deadPile).toHaveLength(0);
        expect(
            g.players['0'].fellowshipArea?.some(
                (c) => c.instanceId === 'gandalf-dead3'
            )
        ).toBe(true);
        expect((played as { isDead?: boolean }).isDead).toBe(false);
        expect((played as { wounds: number }).wounds).toBe(0);
    });

    it('une carte non-Wizard dans la pile de mort n’est pas candidate', () => {
        const dead = createCompanion({ instanceId: 'boromir-dead', name: 'Boromir' });
        const g = stateOn(pinnacle(), { dead: [dead], fellowship: trio() });
        const candidates = getDeckOrDiscardPlayCandidates(
            g,
            '0',
            [['WIZARD']],
            'fellowship',
            null,
            'DEAD_PILE'
        );
        expect(candidates).toHaveLength(0);
    });
});
