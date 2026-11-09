import { describe, expect, it } from 'vitest';
import {
    canVisuallyStackSupportCard,
    groupSupportAreaForDisplay,
} from '../logic/supportAreaStack';
import { createCard } from './createGameState';

describe('supportAreaStack', () => {
    it('refuse les uniques et les cartes avec état stocké', () => {
        expect(
            canVisuallyStackSupportCard(
                createCard({ id: 'u', isUnique: true, type: 'CONDITION' })
            )
        ).toBe(false);
        expect(
            canVisuallyStackSupportCard(
                createCard({
                    id: 't',
                    type: 'CONDITION',
                    cultureTokens: { GANDALF: 2 },
                })
            )
        ).toBe(false);
        expect(
            canVisuallyStackSupportCard(
                createCard({
                    id: 's',
                    type: 'CONDITION',
                    stacked: [createCard({ id: 'orc' })],
                })
            )
        ).toBe(false);
        expect(
            canVisuallyStackSupportCard(
                createCard({
                    id: 'a',
                    type: 'CONDITION',
                    animatedMinion: {
                        expiresAtPhase: 'REGROUP',
                        savedType: 'CONDITION',
                        stillCondition: true,
                    },
                })
            )
        ).toBe(false);
        expect(
            canVisuallyStackSupportCard(
                createCard({
                    id: '18U21',
                    type: 'CONDITION',
                    subtype: 'SUPPORT-AREA',
                })
            )
        ).toBe(true);
    });

    it('empile les copies vides du même id, laisse les chargées seules', () => {
        const a1 = createCard({
            id: '18U21',
            instanceId: 'ls-1',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
        });
        const a2 = createCard({
            id: '18U21',
            instanceId: 'ls-2',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
        });
        const charged = createCard({
            id: '18U21',
            instanceId: 'ls-3',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            cultureTokens: { GANDALF: 1 },
        });
        const other = createCard({
            id: '1C20',
            instanceId: 'ltc-1',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
        });

        const groups = groupSupportAreaForDisplay([a1, a2, charged, other]);
        expect(groups).toHaveLength(3);
        expect(groups[0]!.cards.map((c) => c.instanceId)).toEqual([
            'ls-1',
            'ls-2',
        ]);
        expect(groups[1]!.cards).toHaveLength(1);
        expect(groups[1]!.cards[0]!.instanceId).toBe('ls-3');
        expect(groups[2]!.cards[0]!.instanceId).toBe('ltc-1');
    });
});
