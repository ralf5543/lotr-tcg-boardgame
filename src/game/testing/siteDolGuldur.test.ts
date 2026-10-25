import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    abilityProjectsOnto,
    collectVisibleAbilities,
    formatAbilityLabelParts,
} from '../engine/abilities/collectAbilities';
import { canPayAbilityCost } from '../engine/abilities/payAbilityCost';
import { resolvePendingFpDiscard } from '../logic/fpDiscardAbility';
import type { Ability, SiteCardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const DOL_TEXT =
    '<keyword>Regroup:</keyword> Exert your minion and remove a threat to make the Free Peoples player discard one of his or her conditions.';

function dolSite(): SiteCardState {
    return createSite({
        id: '17U145',
        siteNumber: 2,
        abilities: parseSiteAbilities(
            DOL_TEXT,
            '17U145'
        ) as unknown as Ability[],
        actionPhases: ['REGROUP'],
        ...({
            instanceId: '17U145-inst',
            kind: 'SITE',
            type: 'SITE',
            ownerId: '1',
        } as object),
    });
}

describe('parseSiteAbilities — Dol Guldur', () => {
    it('Regroup : exert séide + −menace → DISCARD chooser FP', () => {
        const abilities = parseSiteAbilities(DOL_TEXT, '17U145');
        expect(abilities).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                optional: true,
                responsePlayer: 'SHADOW',
                cost: [
                    expect.objectContaining({
                        removeThreats: 1,
                        exert: [
                            expect.objectContaining({
                                target: [['MINION']],
                                mode: 'DESIGNATION',
                            }),
                        ],
                    }),
                ],
                effects: [
                    {
                        type: 'DISCARD',
                        count: 1,
                        target: [['CONDITION', 'FREE_PEOPLE']],
                        chooser: 'FREE_PEOPLE',
                    },
                ],
            }),
        ]);
    });
});

describe('projection — Dol Guldur', () => {
    it('bulle sur le séide, pré-désignation structurelle, libellé complet', () => {
        const site = dolSite();
        const orc = createMinion({ id: 'orc-1', instanceId: 'orc-1', vitality: 3 });
        const G = createGameState({
            path: [site as never],
            battlefield: [orc],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0, threats: 2 }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
        });
        const rows = collectVisibleAbilities(G, orc);
        expect(rows.map((r) => r.ability.id)).toEqual([site.abilities![0]!.id]);
        // Le clic sur la bulle doit payer avec CET hôte (pas de re-désignation).
        expect(
            abilityProjectsOnto(
                G,
                rows[0]!.source,
                rows[0]!.ability,
                orc
            )
        ).toBe(true);
        expect(collectVisibleAbilities(G, site as never)).toEqual([]);
        const label = formatAbilityLabelParts(
            rows[0]!.ability,
            rows[0]!.source,
            orc
        );
        expect(label.cost).toBe(
            'Affaiblir ce personnage et retirer 1 menace'
        );
        expect(label.effect).toBe(
            'défausser une situation des Peuples Libres'
        );
    });
});

describe('runtime — Dol Guldur', () => {
    it('Ombre active → pending FP ; FP défausse une situation', () => {
        const condition = createCard({
            id: 'cond-1',
            instanceId: 'cond-1',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            title: 'Nine Walkers',
        });
        const orc = createMinion({
            id: 'orc-1',
            instanceId: 'orc-1',
            vitality: 3,
        });
        const site = dolSite();
        const ability = site.abilities![0]!;

        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '1',
            G: {
                path: [site],
                battlefield: [orc],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        threats: 2,
                        fellowshipArea: [createCompanion({ id: 'c1' })],
                        supportArea: [condition],
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 0 }),
                },
            },
        });

        // Fenêtre de regroupement : FP passe, puis Ombre agit.
        engine.updatePlayerID('0');
        engine.moves.passActionWindow();
        engine.updatePlayerID('1');
        engine.moves.activateAbility(
            '17U145-inst',
            ability.id,
            'orc-1'
        );
        const after = engine.getG();
        expect(after.battlefield[0]?.wounds).toBe(1);
        expect(after.players['0']?.threats).toBe(1);
        expect(after.pendingFpDiscard?.playerId).toBe('0');

        engine.updatePlayerID('0');
        engine.moves.resolveFpDiscardChoice('cond-1');
        const done = engine.getG();
        expect(done.pendingFpDiscard).toBeUndefined();
        expect(done.players['0']?.supportArea).toHaveLength(0);
        expect(done.players['0']?.discard).toHaveLength(1);
    });

    it('refuse s’il n’y a pas de menace', () => {
        const G = createGameState({
            path: [dolSite()],
            battlefield: [createMinion({ id: 'orc', vitality: 3 })],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    threats: 0,
                    supportArea: [
                        createCard({
                            id: 'cond',
                            type: 'CONDITION',
                            kind: 'FREE_PEOPLE',
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        const site = G.path[0] as SiteCardState;
        expect(
            canPayAbilityCost(
                G,
                site as never,
                site.abilities![0]!.cost,
                '1'
            )
        ).toBe(false);
    });

    it('resolvePendingFpDiscard refuse une mauvaise cible', () => {
        const G = createGameState({
            path: [dolSite()],
            players: {
                '0': createPlayerState('0', {
                    supportArea: [
                        createCard({
                            id: 'cond-1',
                            instanceId: 'cond-1',
                            type: 'CONDITION',
                            kind: 'FREE_PEOPLE',
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        G.pendingFpDiscard = {
            playerId: '0',
            sourceInstanceId: '17U145-inst',
            abilityId: G.path[0]!.abilities![0]!.id,
        };
        expect(resolvePendingFpDiscard(G, '0', 'missing')).toBe(false);
        expect(G.pendingFpDiscard).toBeDefined();
    });
});
