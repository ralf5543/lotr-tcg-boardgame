import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    afterSiteStartAbilityResolved,
    beginOptionalSiteStartAbility,
    declinePendingSiteStartAbility,
} from '../logic/siteStartAbility';
import type { Ability, SiteCardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const ISENWASH_TEXT =
    '<keyword>Battleground. Plains.</keyword> At the start of the regroup phase, each Shadow player may exert a minion to exert a companion.';

function isenwashSite(): SiteCardState {
    return createSite({
        id: '13U193',
        siteNumber: 2,
        abilities: parseSiteAbilities(
            ISENWASH_TEXT,
            '13U193'
        ) as unknown as Ability[],
        actionPhases: ['START_OF_REGROUP'],
        ...({
            instanceId: '13U193-inst',
            kind: 'SITE',
            type: 'SITE',
        } as object),
    });
}

function buildState() {
    return createGameState({
        path: [isenwashSite()],
        battlefield: [createMinion({ id: 'orc', vitality: 3 })],
        players: {
            '0': createPlayerState('0', {
                currentSiteIndex: 0,
                fellowshipArea: [
                    createCompanion({ id: 'aragorn', vitality: 4 }),
                ],
            }),
            '1': createPlayerState('1'),
        },
    });
}

describe('parseSiteAbilities — Isenwash', () => {
    it('début regroup Ombre : exert séide → exert compagnon', () => {
        const abilities = parseSiteAbilities(ISENWASH_TEXT, '13U193');
        expect(abilities).toEqual([
            expect.objectContaining({
                phases: ['START_OF_REGROUP'],
                optional: true,
                responsePlayer: 'SHADOW',
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['MINION']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'EXERT',
                        count: 1,
                        target: [['COMPANION']],
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — Isenwash', () => {
    it('ouvre le toaster pour l’Ombre en début de regroupement', () => {
        const G = buildState();
        expect(beginOptionalSiteStartAbility(G, 'startOfRegroup')).toBe(true);
        expect(G.pendingSiteStartAbility).toEqual(
            expect.objectContaining({
                playerId: '1',
                siteInstanceId: '13U193-inst',
                phase: 'startOfRegroup',
            })
        );
    });

    it('Passer ferme et enchaîne vers regroup', () => {
        const G = buildState();
        beginOptionalSiteStartAbility(G, 'startOfRegroup');
        const phases: string[] = [];
        expect(
            declinePendingSiteStartAbility(G, '1', {
                setPhase: (p) => phases.push(p),
            })
        ).toBe(true);
        expect(G.pendingSiteStartAbility).toBeUndefined();
        expect(phases).toEqual(['regroup']);
    });

    it('moteur : entrée startOfRegroup ouvre le toaster Ombre', () => {
        const engine = createEngineClient({
            startPhase: 'startOfRegroup',
            playerID: '1',
            G: {
                path: [isenwashSite()],
                battlefield: [createMinion({ id: 'orc', vitality: 3 })],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [
                            createCompanion({ id: 'aragorn', vitality: 4 }),
                        ],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        expect(engine.getCtx().phase).toBe('startOfRegroup');
        expect(engine.getG().pendingSiteStartAbility?.playerId).toBe('1');
    });

    it('après une activation : re-propose si encore légal (pas exit regroup)', () => {
        const G = buildState();
        beginOptionalSiteStartAbility(G, 'startOfRegroup');
        // Simule un exert déjà payé (séide encore exertable + compagnon).
        G.battlefield[0]!.wounds = 1;
        const phases: string[] = [];
        afterSiteStartAbilityResolved(G, {
            setPhase: (p) => phases.push(p),
        });
        expect(G.pendingSiteStartAbility?.playerId).toBe('1');
        expect(phases).toEqual([]);
    });

    it('après activation : exit si plus de séide exertable', () => {
        const G = buildState();
        beginOptionalSiteStartAbility(G, 'startOfRegroup');
        // Vitalité 1 restante → plus d’exert possible.
        G.battlefield[0]!.wounds = 2;
        const phases: string[] = [];
        afterSiteStartAbilityResolved(G, {
            setPhase: (p) => phases.push(p),
        });
        expect(G.pendingSiteStartAbility).toBeUndefined();
        expect(phases).toEqual(['regroup']);
    });
});
