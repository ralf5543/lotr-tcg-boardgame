import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { getMoveLimit } from '../logic/moveLimit';
import type { CardState } from '../types';
import {
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'To play, spot 2 <symbol>gondor</symbol> Men. <br><keyword>Fellowship:</keyword> Play an artifact on Elendil to make the move limit +1 for this turn. <br><keyword>Regroup:</keyword> Discard a <symbol>gondor</symbol> artifact to liberate a site.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

describe('Elendil The Tall 9R+32', () => {
    it('analyse : Fellowship jouer artefact → limite +1 ; Regroup libérer', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Elendil', '9R+32') || [];
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['FELLOWSHIP'],
                    effects: [
                        expect.objectContaining({
                            type: 'PLAY_FROM_HAND',
                            target: [['ARTIFACT']],
                            attachTo: 'SELF',
                        }),
                        expect.objectContaining({
                            type: 'MODIFY_MOVE_LIMIT',
                            value: 1,
                            expiresAtPhase: 'TURN_END',
                        }),
                    ],
                }),
                expect.objectContaining({
                    phases: ['REGROUP'],
                    effects: [{ type: 'LIBERATE_SITE' }],
                }),
            ])
        );
    });

    it('Communauté : jouer Narsil sur Elendil → limite 3', () => {
        const elendil = {
            ...realCard('9R+32', 'elendil'),
            abilities: parseAbilities(CSV_TEXT, 'Elendil', '9R+32') || [],
        };
        const ability = elendil.abilities!.find((ab) =>
            (ab.effects || []).some((e) => e.type === 'PLAY_FROM_HAND')
        )!;
        const narsil = realCard('9R+34', 'narsil');
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        realCard('9R+31', 'boromir'),
                        realCard('7R91', 'faramir'),
                        elendil,
                    ],
                    hand: [narsil],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(getMoveLimit(G)).toBe(2);
        expect(abilityHasLegalEffectTarget(G, elendil, ability)).toBe(true);
        expect(
            getEffectDesignationCandidates(G, elendil, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['narsil']);

        const parts = formatAbilityLabelParts(ability, elendil);
        expect(parts.cost).toMatch(/jouer.*artefact/i);
        expect(parts.effect).toMatch(/limite de déplacement \+1/i);

        expect(applyAbilityEffect(G, elendil, ability, ['narsil'])).toBe(true);
        expect(elendil.attachments?.some((a) => a.id === '9R+34')).toBe(true);
        expect(G.players['0']!.hand).toHaveLength(0);
        expect(getMoveLimit(G)).toBe(3);
        expect(G.tempMoveLimitMods?.some((m) => m.value === 1)).toBe(true);
    });

});
