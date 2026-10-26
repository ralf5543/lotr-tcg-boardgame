import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    beginOptionalSitePhaseAbility,
    getSitePhaseDesignationCandidates,
    resolvePendingSitePhaseAbility,
    resolvePendingSitePhaseDesignation,
} from '../logic/sitePhaseAbility';
import type { Ability, SiteCardState } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const ANGLE_TEXT =
    'Shadow: Play a Nazgûl (or spot 6 companions and discard 2 cards from hand) to draw a card.';
const BUCKLAND_TEXT =
    'Shadow: Play a Nazgûl to discard a condition from play.';
const MARSHLAND_TEXT =
    'Shadow: If the total number of minions and twilight tokens is 3 or fewer, play a minion at twilight cost –3.';
const WOODY_END_TEXT =
    'Shadow: Remove a burden to play a Nazgûl from your discard pile.';

function familySite(
    id: string,
    name: string,
    text: string
): SiteCardState {
    return createSite({
        id,
        name,
        abilities: parseSiteAbilities(text, id) as unknown as Ability[],
    });
}

const nazgulInHand = (cost = 4) =>
    createMinion({
        id: 'nazgul-card',
        instanceId: 'nazgul-1',
        race: 'NAZGÛL',
        culture: 'WRAITH',
        title: 'Úlairë',
        twilightCost: cost,
    });

const fillerShadow = (n: number) =>
    createCard({
        id: `filler-${n}`,
        instanceId: `filler-${n}`,
        kind: 'SHADOW',
        type: 'CONDITION',
        title: `Filler ${n}`,
    });

describe('parseSiteAbilities — famille « Shadow: play… »', () => {
    it('The Angle : deux modes (jouer un Nazgûl / spot + défausse)', () => {
        const abilities = parseSiteAbilities(ANGLE_TEXT, '12U185')!;
        expect(abilities).toHaveLength(2);
        expect(abilities[0]).toEqual(
            expect.objectContaining({
                phases: ['SHADOW'],
                cost: [],
                effects: [
                    { type: 'PLAY_FROM_HAND', target: [['NAZGUL']] },
                    { type: 'DRAW', count: 1 },
                ],
            })
        );
        expect(abilities[1]!).toEqual(
            expect.objectContaining({
                phases: ['SHADOW'],
                cost: [
                    {
                        spot: [
                            {
                                count: 6,
                                target: [['COMPANION']],
                                mode: 'CONDITION',
                            },
                        ],
                        discardFromHand: 2,
                    },
                ],
                effects: [{ type: 'DRAW', count: 1 }],
            })
        );
    });

    it('Buckland : PLAY_FROM_HAND Nazgûl puis DISCARD situation', () => {
        expect(parseSiteAbilities(BUCKLAND_TEXT, '11S230')).toEqual([
            expect.objectContaining({
                cost: [],
                effects: [
                    { type: 'PLAY_FROM_HAND', target: [['NAZGUL']] },
                    { type: 'DISCARD', count: 1, target: [['CONDITION']] },
                ],
            }),
        ]);
    });

    it('Expanding Marshland : condition séides + crépuscule ≤ 3, réduction 3', () => {
        expect(parseSiteAbilities(MARSHLAND_TEXT, '11S238')).toEqual([
            expect.objectContaining({
                requiresMinionsPlusTwilightAtMost: 3,
                cost: [],
                effects: [
                    {
                        type: 'PLAY_FROM_HAND',
                        target: [['MINION']],
                        twilightReduce: 3,
                    },
                ],
            }),
        ]);
    });

    it('Woody-End : retirer un fardeau puis jouer un Nazgûl depuis la défausse', () => {
        expect(parseSiteAbilities(WOODY_END_TEXT, '11S266')).toEqual([
            expect.objectContaining({
                cost: [{ removeBurdens: 1 }],
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        from: 'DISCARD',
                        target: [['NAZGUL']],
                    },
                ],
            }),
        ]);
    });
});

describe('The Angle — toaster deux modes', () => {
    function angleG(shadowHand = [nazgulInHand(), fillerShadow(1)]) {
        const site = familySite('12U185', 'The Angle', ANGLE_TEXT);
        return createGameState({
            currentSiteIndex: 0,
            path: [site],
            twilightPool: 6,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: Array.from({ length: 6 }, (_, i) =>
                        createCompanion({ instanceId: `comp-${i}` })
                    ),
                }),
                '1': createPlayerState('1', {
                    hand: shadowHand,
                    deck: [fillerShadow(90), fillerShadow(91)],
                }),
            },
        });
    }

    it('offre le toaster à l’Ombre ; mode A joue le Nazgûl et fait piocher, puis ré-offre', () => {
        const G = angleG();
        expect(beginOptionalSitePhaseAbility(G)).toBe(true);
        expect(G.pendingSitePhaseAbility?.playerId).toBe('1');

        expect(
            resolvePendingSitePhaseAbility(
                G,
                '1',
                true,
                undefined,
                'nazgul-1'
            )
        ).toBe(true);
        expect(G.battlefield.map((c) => c.instanceId)).toContain('nazgul-1');
        expect(G.twilightPool).toBe(2); // 6 − 4 (coût du Nazgûl)
        expect(G.players['1']?.hand.map((c) => c.instanceId)).toEqual([
            'filler-1',
            'filler-90',
        ]);
        // Action répétable : le toaster est ré-offert (mode B reste légal).
        expect(G.pendingSitePhaseAbility?.playerId).toBe('1');

        expect(resolvePendingSitePhaseAbility(G, '1', false)).toBe(true);
        expect(beginOptionalSitePhaseAbility(G)).toBe(false);
    });

    it('mode B : désigner 6 compagnons et défausser 2 cartes pour piocher', () => {
        const fillerIds = [fillerShadow(2), fillerShadow(3)];
        const G = angleG([nazgulInHand(), ...fillerIds]);
        beginOptionalSitePhaseAbility(G);
        const modeB = (G.path[0] as SiteCardState).abilities?.[1];
        expect(modeB).toBeDefined();

        expect(
            resolvePendingSitePhaseAbility(
                G,
                '1',
                true,
                ['filler-2', 'filler-3'],
                undefined,
                modeB!.id
            )
        ).toBe(true);
        expect(G.players['1']?.discard.map((c) => c.instanceId)).toEqual([
            'filler-2',
            'filler-3',
        ]);
        expect(G.players['1']?.hand.map((c) => c.instanceId)).toEqual([
            'nazgul-1',
            'filler-90',
        ]);
    });

    it('pas d’offre sans Nazgûl en main ni assez de cartes à défausser', () => {
        const G = angleG([fillerShadow(1)]);
        expect(beginOptionalSitePhaseAbility(G)).toBe(false);
    });
});

describe('Buckland Homestead — désignation reportée', () => {
    function bucklandG(withCondition = true) {
        const site = familySite(
            '11S230',
            'Buckland Homestead',
            BUCKLAND_TEXT
        );
        const fpCondition = createCard({
            id: 'fp-condition',
            instanceId: 'fp-cond-1',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            title: 'FP Condition',
        });
        return createGameState({
            currentSiteIndex: 0,
            path: [site],
            twilightPool: 6,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    supportArea: withCondition ? [fpCondition] : [],
                }),
                '1': createPlayerState('1', {
                    hand: [nazgulInHand()],
                }),
            },
        });
    }

    it('pas d’offre sans situation en jeu à défausser', () => {
        expect(beginOptionalSitePhaseAbility(bucklandG(false))).toBe(false);
    });

    it('joue le Nazgûl, puis la désignation défausse la situation', () => {
        const G = bucklandG();
        expect(beginOptionalSitePhaseAbility(G)).toBe(true);
        expect(
            resolvePendingSitePhaseAbility(
                G,
                '1',
                true,
                undefined,
                'nazgul-1'
            )
        ).toBe(true);
        expect(G.battlefield.map((c) => c.instanceId)).toContain('nazgul-1');
        expect(G.twilightPool).toBe(2);
        expect(G.pendingSitePhaseDesignation?.playerId).toBe('1');
        expect(
            getSitePhaseDesignationCandidates(G).map((c) => c.instanceId)
        ).toEqual(['fp-cond-1']);

        // Ni l’autre joueur, ni une mauvaise carte.
        expect(resolvePendingSitePhaseDesignation(G, '0', 'fp-cond-1')).toBe(
            false
        );
        expect(resolvePendingSitePhaseDesignation(G, '1', 'nazgul-1')).toBe(
            false
        );
        expect(resolvePendingSitePhaseDesignation(G, '1', 'fp-cond-1')).toBe(
            true
        );
        expect(G.pendingSitePhaseDesignation).toBeUndefined();
        expect(G.players['0']?.supportArea).toHaveLength(0);
        expect(G.players['0']?.discard.map((c) => c.instanceId)).toContain(
            'fp-cond-1'
        );
        // Plus de situation : pas de ré-offre.
        expect(G.pendingSitePhaseAbility).toBeUndefined();
    });
});

describe('Expanding Marshland — condition et réduction', () => {
    function marshlandG(twilightPool: number) {
        const site = familySite(
            '11S238',
            'Expanding Marshland',
            MARSHLAND_TEXT
        );
        return createGameState({
            currentSiteIndex: 0,
            path: [site],
            twilightPool,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', {
                    hand: [createMinion({ instanceId: 'big-minion', twilightCost: 5 })],
                }),
            },
        });
    }

    it('total ≤ 3 : le séide à 5 se joue pour 2', () => {
        const G = marshlandG(3);
        expect(beginOptionalSitePhaseAbility(G)).toBe(true);
        expect(
            resolvePendingSitePhaseAbility(
                G,
                '1',
                true,
                undefined,
                'big-minion'
            )
        ).toBe(true);
        expect(G.battlefield.map((c) => c.instanceId)).toContain('big-minion');
        expect(G.twilightPool).toBe(1); // 3 − (5 − 3)
    });

    it('total > 3 : pas d’offre', () => {
        expect(beginOptionalSitePhaseAbility(marshlandG(4))).toBe(false);
    });
});

describe('Woody-End — Nazgûl depuis la défausse', () => {
    function woodyG(burdens: number) {
        const site = familySite('11S266', 'Woody-End', WOODY_END_TEXT);
        return createGameState({
            currentSiteIndex: 0,
            path: [site],
            twilightPool: 6,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    burdens,
                }),
                '1': createPlayerState('1', {
                    discard: [nazgulInHand()],
                }),
            },
        });
    }

    it('retire un fardeau et joue le Nazgûl de la défausse', () => {
        const G = woodyG(2);
        expect(beginOptionalSitePhaseAbility(G)).toBe(true);
        expect(
            resolvePendingSitePhaseAbility(
                G,
                '1',
                true,
                undefined,
                'nazgul-1'
            )
        ).toBe(true);
        expect(G.players['0']?.burdens).toBe(1);
        expect(G.battlefield.map((c) => c.instanceId)).toContain('nazgul-1');
        expect(G.players['1']?.discard).toHaveLength(0);
        expect(G.twilightPool).toBe(2);
    });

    it('sans fardeau : pas d’offre', () => {
        expect(beginOptionalSitePhaseAbility(woodyG(0))).toBe(false);
    });
});
