import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createPlayerState,
} from './createGameState';
import { getCardById } from '../cardsData';
import { isRingBearerCard } from '../../utils/cardUtils';

const SAM_CSV =
    '<keyword>Ring-bound.</keyword><br>Sam is strength +1 for each <symbol>shire</symbol> companion you can spot.<br><keyword>Response:</keyword> If Frodo dies, make Sam the <keyword>Ring-bearer (resistance 5).</keyword>';

describe('Sam — If Frodo dies (parser + runtime)', () => {
    it('parse : réponse obligatoire MAKE_RING_BEARER', () => {
        expect(parseAbilities(SAM_CSV, 'Sam', '10P122')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    optional: false,
                    trigger: {
                        type: 'CHARACTER_DIES',
                        target: [['Frodo']],
                    },
                    effects: [
                        { type: 'MAKE_RING_BEARER', resistance: 5 },
                    ],
                }),
            ])
        );
        expect(
            getCardById('10P122')?.abilities?.some(
                (a) =>
                    a.trigger?.type === 'CHARACTER_DIES' &&
                    a.effects?.[0]?.type === 'MAKE_RING_BEARER'
            )
        ).toBe(true);
        expect(
            getCardById('2C114')?.abilities?.some(
                (a) =>
                    a.trigger?.type === 'CHARACTER_DIES' &&
                    a.effects?.[0]?.type === 'MAKE_RING_BEARER'
            )
        ).toBe(true);
    });

    it('à la mort de Frodon : Sam devient Porteur, reçoit l’Anneau, fardeaux remis à zéro', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            instanceId: 'frodo',
            keywords: ['RING-BEARER', 'RING-BOUND'],
            vitality: 1,
            resistance: 10,
            attachments: [
                createCard({
                    id: '11R1',
                    instanceId: 'one-ring',
                    type: 'RING',
                    title: 'The One Ring',
                    kind: 'FREE_PEOPLE',
                    strength: 1,
                }),
            ],
        });
        const samCard = getCardById('10P122')!;
        const samAbility = samCard.abilities!.find(
            (a) => a.trigger?.type === 'CHARACTER_DIES'
        )!;
        const sam = createCompanion({
            id: '10P122',
            instanceId: 'sam',
            title: 'Sam',
            keywords: ['RING-BOUND'],
            vitality: 4,
            resistance: 5,
            actionPhases: ['RESPONSE'],
            abilities: samCard.abilities,
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, sam],
                        // 2 fardeaux : Sam rés. 5 reste > 0 (pas de corruption).
                        burdens: 2,
                    }),
                },
            },
        });

        engine.moves.applyWound('frodo');

        // Obligatoire : auto-résolu, pas de toaster « activer Sam ».
        const G = engine.getG();
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();

        const livingSam = G.players['0']?.fellowshipArea.find(
            (card) => card.instanceId === 'sam'
        );
        const deadFrodo = G.players['0']?.fellowshipArea.find(
            (card) => card.instanceId === 'frodo'
        );

        expect(livingSam?.keywords?.includes('RING-BEARER')).toBe(true);
        expect(isRingBearerCard(livingSam!)).toBe(true);
        expect(livingSam?.resistance).toBe(5);
        expect(livingSam?.attachments?.some((att) => att.type === 'RING')).toBe(
            true
        );
        expect(livingSam?.attachments?.some((att) => att.id === '11R1')).toBe(
            true
        );
        expect(deadFrodo?.attachments?.some((att) => att.type === 'RING')).toBe(
            false
        );
        expect(deadFrodo?.keywords?.includes('RING-BEARER')).toBe(false);
        expect(isRingBearerCard(deadFrodo!)).toBe(false);
        expect(deadFrodo?.isDead).toBe(true);
        // Relève : les points-fardeau repartent.
        expect(G.players['0']?.burdens).toBe(0);
        expect(G.gameResult).toBeUndefined();
        expect(samAbility.optional).toBe(false);
    });
});

