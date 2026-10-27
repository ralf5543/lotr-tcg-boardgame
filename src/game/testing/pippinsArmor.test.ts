import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { applyWoundAndCheckDeath } from '../../utils/applyWoundAndCheckDeath';
import { canCardTakeWound } from '../logic/sites';
import type { Ability, CardState } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { applyDevPreset } from '../dev/presets';

const TEXT =
    'Bearer must be Pippin. \nWhile you can spot 3 <symbol>gondor</symbol> Men, Pippin may take no more than 1 wound in a skirmish.';

const ARMOR_ABILITY: Ability = {
    id: '7R113:0:while-spot-wound-limit',
    phases: [],
    trigger: {
        type: 'WHILE',
        spot: [{ count: 3, target: [['GONDOR', 'MAN']] }],
    },
    cost: [],
    effects: [{ type: 'LIMIT_WOUNDS_IN_SKIRMISH', max: 1, target: 'BEARER' }],
    source: 'ATTACHMENT',
    text: 'While you can spot 3 Gondor Men, Pippin may take no more than 1 wound in a skirmish.',
};

function gondorMan(id: string): CardState {
    return createCompanion({ id, title: id, race: 'MAN' });
}

function stateWithPippin(menCount: number, inSkirmish = true) {
    const armor = createCard({
        id: '7R113',
        instanceId: 'armor',
        kind: 'FREE_PEOPLE',
        type: 'POSSESSION',
        title: "Pippin's Armor",
        abilities: [ARMOR_ABILITY],
    });
    const pippin = createCompanion({
        id: 'pippin',
        title: 'Pippin',
        culture: 'SHIRE',
        race: 'HOBBIT',
        vitality: 3,
        attachments: [armor],
    });
    const men = Array.from({ length: menCount }, (_, i) =>
        gondorMan(`man-${i}`)
    );
    const G = createGameState({
        ...(inSkirmish
            ? {
                  activeSkirmishId: 'sk-1',
                  skirmishes: [
                      { id: 'sk-1', companionId: 'pippin', minionIds: ['orc'] },
                  ],
                  battlefield: [createMinion({ id: 'orc' })],
              }
            : {}),
        players: {
            '0': createPlayerState('0', {
                fellowshipArea: [pippin, ...men],
            }),
            '1': createPlayerState('1'),
        },
    });
    return { G, pippin };
}

describe('Armure de Pippin 7R113 — plafond de blessures par escarmouche', () => {
    it('analyse : repérer 3 Hommes du Gondor → plafond 1 sur le porteur', () => {
        expect(parseAbilities(TEXT, "Pippin's Armor", '7R113')).toEqual([
            expect.objectContaining({
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 3, target: [['GONDOR', 'MAN']] }],
                },
                effects: [
                    {
                        type: 'LIMIT_WOUNDS_IN_SKIRMISH',
                        max: 1,
                        target: 'BEARER',
                    },
                ],
                source: 'ATTACHMENT',
            }),
        ]);
    });

    it('3 Hommes repérés : 2 blessures demandées → 1 seule, puis plus aucune', () => {
        const { G, pippin } = stateWithPippin(3);

        applyWoundAndCheckDeath(G, pippin, 2);
        expect(pippin.wounds).toBe(1);
        expect(canCardTakeWound(G, pippin)).toBe(false);

        applyWoundAndCheckDeath(G, pippin, 1);
        expect(pippin.wounds).toBe(1);
    });

    it('seulement 2 Hommes repérés : pas de plafond', () => {
        const { G, pippin } = stateWithPippin(2);

        applyWoundAndCheckDeath(G, pippin, 2);
        expect(pippin.wounds).toBe(2);
    });

    it('hors escarmouche active : pas de plafond', () => {
        const { G, pippin } = stateWithPippin(3, false);

        applyWoundAndCheckDeath(G, pippin, 2);
        expect(pippin.wounds).toBe(2);
    });

    it('escarmouche suivante : le compteur repart de zéro', () => {
        const { G, pippin } = stateWithPippin(3);
        applyWoundAndCheckDeath(G, pippin, 1);
        expect(pippin.wounds).toBe(1);

        G.activeSkirmishId = 'sk-2';
        G.skirmishes = [
            { id: 'sk-2', companionId: 'pippin', minionIds: ['orc'] },
        ];
        applyWoundAndCheckDeath(G, pippin, 1);
        expect(pippin.wounds).toBe(2);
    });

    it('preset DEV : Pippin avec Armure, 3 Hommes du Gondor, 2 Uruks Dégâts +1', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_PIPPIN');

        const fellowship = G.players['0']?.fellowshipArea || [];
        expect(fellowship.map((c) => c.id)).toEqual([
            '2C102',
            '7R324',
            '1R89',
            '11R57',
            '5C35',
        ]);
        const pippin = fellowship[1];
        expect(pippin?.attachments?.[0]?.id).toBe('7R113');
        expect(pippin?.attachments?.[0]?.abilities?.length).toBeGreaterThan(0);
        expect(G.players['1']?.hand.map((c) => c.id)).toEqual([
            '1C151',
            '1C151',
        ]);
        expect(G.path).toHaveLength(9);
    });

    it('un affaiblissement ne compte pas comme blessure prise', () => {
        const { G, pippin } = stateWithPippin(3);

        applyWoundAndCheckDeath(G, pippin, 1, { fromExert: true });
        expect(pippin.wounds).toBe(1);
        // Le plafond de blessures, lui, est toujours disponible.
        applyWoundAndCheckDeath(G, pippin, 1);
        expect(pippin.wounds).toBe(2);
    });
});
