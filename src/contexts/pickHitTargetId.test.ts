import { describe, expect, it } from 'vitest';
import { pickHitTargetId, type HitCandidate } from './pickHitTargetId';

describe('pickHitTargetId', () => {
    it('préfère l’hôte aux attachements qui chevauchent (drop normal)', () => {
        const candidates: HitCandidate[] = [
            {
                id: 'frodo',
                isZone: false,
                isNestedOnHost: false,
                area: 10000,
            },
            {
                id: 'the-one-ring',
                isZone: false,
                isNestedOnHost: true,
                area: 9000,
            },
        ];
        expect(pickHitTargetId(candidates)).toBe('frodo');
    });

    it('en désignation, préfère l’attachement s’il est autorisé', () => {
        const candidates: HitCandidate[] = [
            {
                id: 'frodo',
                isZone: false,
                isNestedOnHost: false,
                area: 10000,
            },
            {
                id: 'the-one-ring',
                isZone: false,
                isNestedOnHost: true,
                area: 9000,
            },
        ];
        expect(
            pickHitTargetId(candidates, {
                allowedIds: ['frodo', 'the-one-ring'],
            })
        ).toBe('the-one-ring');
    });

    it('aire de soutien : préfère la zone pour une situation SUPPORT-AREA', () => {
        const candidates: HitCandidate[] = [
            {
                id: 'some-condition',
                isZone: false,
                isNestedOnHost: false,
                area: 5000,
            },
            {
                id: 'supportArea',
                isZone: true,
                isNestedOnHost: false,
                area: 80000,
            },
        ];
        expect(
            pickHitTargetId(candidates, { preferSupportZone: true })
        ).toBe('supportArea');
    });
});
