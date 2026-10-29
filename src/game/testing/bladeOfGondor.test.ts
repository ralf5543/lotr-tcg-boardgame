import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'Bearer must be Boromir. <br>He is <keyword>damage +1.</keyword> <br><keyword>Skirmish:</keyword> Exert Boromir to wound an Orc or Uruk-hai he is skirmishing.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function skirmishWoundAbility(card: CardState): Ability {
    const ability = (card.abilities || []).find((ab) =>
        (ab.effects || []).some(
            (e) => e.type === 'WOUND' && e.target === 'SKIRMISHING'
        )
    );
    if (!ability) throw new Error('Capacité Combat manquante');
    return ability;
}

describe('Blade of Gondor 1R95 — blesser Orque/Ourouk au combat', () => {
    it('analyse CSV : affaiblir Boromir → WOUND SKIRMISHING match ORC|URUK-HAI', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, 'Blade of Gondor', '1R95') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
                    effects: [
                        {
                            type: 'WOUND',
                            count: 1,
                            target: 'SKIRMISHING',
                            match: [['ORC'], ['URUK-HAI']],
                        },
                    ],
                    source: 'ATTACHMENT',
                }),
            ])
        );
        expect(
            getCardById('1R95')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) =>
                        e.type === 'WOUND' &&
                        e.target === 'SKIRMISHING' &&
                        JSON.stringify(e.match) ===
                            JSON.stringify([['ORC'], ['URUK-HAI']])
                )
            )
        ).toBe(true);
    });

    it('Poêle à frire : Orque seul', () => {
        expect(
            parseAbilities(
                '<keyword>Skirmish:</keyword> Exert bearer to wound an Orc he or she is skirmishing.',
                'Frying Pan',
                '3C108'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    effects: [
                        {
                            type: 'WOUND',
                            count: 1,
                            target: 'SKIRMISHING',
                            match: [['ORC']],
                        },
                    ],
                }),
            ])
        );
    });

    it('désignation : Orque oui, Suderon non', () => {
        const blade = realCard('1R95', 'blade');
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            vitality: 3,
            attachments: [blade],
        });
        const orc = createMinion({
            id: 'orc',
            title: 'Orc',
            race: 'ORC',
            vitality: 2,
        });
        const southron = createMinion({
            id: 'southron',
            title: 'Desert Warrior',
            race: 'MAN',
            vitality: 2,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [boromir],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [orc, southron],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'boromir',
                    minionIds: ['orc', 'southron'],
                },
            ],
            activeSkirmishId: 'sk-1',
        });
        const ability = skirmishWoundAbility(blade);
        const candidates = getEffectDesignationCandidates(G, blade, ability);
        expect(candidates.map((c) => c.instanceId || c.id)).toEqual(['orc']);
    });

    it('blesse l’Orque après affaiblissement de Boromir', () => {
        const blade = realCard('1R95', 'blade');
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            vitality: 3,
            wounds: 0,
            attachments: [blade],
        });
        const orc = createMinion({
            id: 'orc',
            title: 'Orc',
            race: 'ORC',
            vitality: 2,
            wounds: 0,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [boromir],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [orc],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'boromir',
                    minionIds: ['orc'],
                },
            ],
            activeSkirmishId: 'sk-1',
        });
        const ability = skirmishWoundAbility(blade);
        expect(canPayAbilityCost(G, blade, ability.cost)).toBe(true);
        expect(payAbilityCost(G, blade, ability.cost)).toBe(true);
        expect(boromir.wounds).toBe(1);
        expect(applyAbilityEffect(G, blade, ability, 'orc')).toBe(true);
        expect(orc.wounds).toBe(1);
    });

});
