import { describe, expect, it } from 'vitest';
import {
    cardTargetIds,
    findUniqueCardByTargetId,
    uniqueCardTargetId,
} from '../engine/abilities/designation';
import {
    getForceAssignPreventDiscardCandidates,
    preventPendingEffect,
    resolveForceAssignPreventDiscard,
} from '../engine/responseWindow';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getCardById } from '../cardsData';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';
import { discardCardFromPlay } from '../../utils/discardCardFromPlay';

describe('uniqueCardTargetId / défausse', () => {
    it('cardTargetIds n’expose que l’instanceId quand il existe', () => {
        const card = createCompanion({
            id: '7C116',
            instanceId: 'dev-ranger-2',
        });
        expect(uniqueCardTargetId(card)).toBe('dev-ranger-2');
        expect(cardTargetIds(card)).toEqual(['dev-ranger-2']);
    });

    it('refuse l’id imprimé ambigu entre plusieurs copies', () => {
        const a = createCompanion({ id: '7C116', instanceId: 'r1' });
        const b = createCompanion({ id: '7C116', instanceId: 'r2' });
        expect(findUniqueCardByTargetId([a, b], '7C116')).toBeUndefined();
        expect(findUniqueCardByTargetId([a, b], 'r2')).toBe(b);
    });

    it('discardCardFromPlay avec id imprimé ne touche pas une carte instanciée', () => {
        const a = createCompanion({ id: '7C116', instanceId: 'r1' });
        const b = createCompanion({ id: '7C116', instanceId: 'r2' });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [a, b],
                }),
                '1': createPlayerState('1'),
            },
        });
        // Mauvaise cible (id imprimé) → pas de défausse.
        expect(
            discardCardFromPlay(G, { ...a, instanceId: undefined } as never)
        ).toBe(false);
        expect(G.players['0']?.fellowshipArea).toHaveLength(2);

        expect(discardCardFromPlay(G, b)).toBe(true);
        expect(
            G.players['0']?.fellowshipArea.map((c) => c.instanceId)
        ).toEqual(['r1']);
        expect(G.players['0']?.discard.map((c) => c.instanceId)).toEqual([
            'r2',
        ]);
    });

    it('Suderon : défausse la copie désignée, pas la 1ʳᵉ au même id imprimé', () => {
        const ability = getCardById('4U249')!.abilities![0]!;
        const commander = {
            ...getCardById('4U249')!,
            instanceId: 'commander',
            abilities: [ability],
        };
        const frodo = createCompanion({
            id: '11S164',
            instanceId: 'frodo',
            keywords: ['RING-BEARER', 'RING-BOUND'],
        });
        const rangers = [1, 2, 3, 4, 5].map((n) =>
            createCompanion({
                id: '7C116',
                instanceId: `ranger-${n}`,
            })
        );
        const G = createGameState({
            fpPlayerId: '0',
            assignmentStep: 'ACTIONS',
            battlefield: [commander],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ...rangers],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(applyAbilityEffect(G, commander, ability)).toBe(true);
        expect(preventPendingEffect(G, '0')).toBe('APPLIED');

        const candidates = getForceAssignPreventDiscardCandidates(G);
        expect(candidates.map((c) => c.instanceId).sort()).toEqual([
            'ranger-1',
            'ranger-2',
            'ranger-3',
            'ranger-4',
            'ranger-5',
        ]);
        // Id imprimé partagé → refusé.
        expect(resolveForceAssignPreventDiscard(G, '0', '7C116')).toBe(false);
        expect(resolveForceAssignPreventDiscard(G, '0', 'ranger-4')).toBe(
            true
        );
        expect(
            G.players['0']?.discard.map((c) => c.instanceId)
        ).toEqual(['ranger-4']);
        expect(
            G.players['0']?.fellowshipArea.map((c) => c.instanceId)
        ).not.toContain('ranger-4');
        expect(G.players['0']?.fellowshipArea).toHaveLength(5);
    });
});
