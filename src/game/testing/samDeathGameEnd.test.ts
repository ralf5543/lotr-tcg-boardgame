import { describe, expect, it } from 'vitest';
import {
    applyGameEndIfNeeded,
    checkRingBearerKilledLoss,
} from '../logic/gameEnd';
import { isRingBearerCard } from '../../utils/cardUtils';
import { createEngineClient } from './createEngineClient';
import { createGameState, createPlayerState } from './createGameState';
import { getCardById } from '../cardsData';
import type { CardState, GameState } from '../types';

function drainResponses(engine: ReturnType<typeof createEngineClient>) {
    let guard = 0;
    while (engine.getG().responseWindow?.isOpen && guard++ < 16) {
        const pid = engine.getG().responseWindow!.activePlayerId;
        engine.updatePlayerID(String(pid));
        engine.moves.passResponseWindow();
    }
}

function cloneCard(id: string, instanceId: string): CardState {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
}

/** Terrain minimal : Frodon à 1 vit., Sam, setup COMPLETE. */
function samRingBearerBoard(
    setupStep: 'COMPLETE' | 'BIDDING' = 'COMPLETE'
): Partial<GameState> {
    const frodo: CardState = {
        ...cloneCard('2C102', 'dev-sam-frodo'),
        keywords: ['RING-BEARER', 'RING-BOUND'],
        wounds: 3,
        attachments: [cloneCard('11R1', 'dev-sam-ring')],
    };
    const sam = cloneCard('10P122', 'dev-sam-sam');
    const merry = cloneCard('1C303', 'dev-sam-merry');

    return {
        fpPlayerId: '0',
        twilightPool: 8,
        setupState: {
            bids: { '0': 0, '1': 0 },
            mulligans: { '0': false, '1': false },
            step: setupStep === 'BIDDING' ? 'BIDDING' : 'COMPLETE',
            ...(setupStep === 'COMPLETE' ? { auctionWinnerId: '0' } : {}),
        },
        battlefield: [
            {
                ...cloneCard('1R237', 'dev-sam-wk'),
                attachments: [cloneCard('1R221', 'dev-sam-pale')],
            },
        ],
        players: {
            '0': createPlayerState('0', {
                burdens: 2,
                fellowshipArea: [frodo, sam, merry],
                profile: {
                    name: 'Raphaël',
                    avatar: '',
                    faction: 'freePeoples',
                },
            }),
            '1': createPlayerState('1', {
                profile: {
                    name: 'Tom',
                    avatar: '',
                    faction: 'shadow',
                },
            }),
        },
    };
}

describe('Sam Porteur — mort → fin de partie (chemin playtest)', () => {
    it('Frodon meurt → Sam Porteur → Sam meurt → fin', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: samRingBearerBoard('COMPLETE'),
        });

        expect(engine.getG().setupState?.step).toBe('COMPLETE');

        engine.moves.applyWound('dev-sam-frodo');
        drainResponses(engine);

        const afterSam = engine.getG();
        const sam = afterSam.players['0']?.fellowshipArea.find(
            (c) => c.instanceId === 'dev-sam-sam'
        );
        expect(sam && isRingBearerCard(sam)).toBe(true);
        expect(afterSam.gameResult).toBeUndefined();

        engine.moves.cleanupPendingDeaths();

        for (let i = 0; i < 4; i++) {
            engine.moves.applyWound('dev-sam-sam');
            drainResponses(engine);
            if (engine.getG().gameResult) break;
        }

        expect(engine.getG().gameResult?.reason).toBe('RING_BEARER_KILLED');
    });

    it('setup encore BIDDING puis COMPLETE via logique fin → Sam meurt → fin', () => {
        const board = samRingBearerBoard('BIDDING');
        // Comme l’ancien preset : forcer COMPLETE pour évaluer la fin.
        board.setupState = {
            bids: { '0': 0, '1': 0 },
            mulligans: { '0': false, '1': false },
            step: 'COMPLETE',
            auctionWinnerId: '0',
        };

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: board,
        });

        expect(engine.getG().setupState?.step).toBe('COMPLETE');

        engine.moves.applyWound('dev-sam-frodo');
        drainResponses(engine);
        engine.moves.cleanupPendingDeaths();

        for (let i = 0; i < 4; i++) {
            engine.moves.applyWound('dev-sam-sam');
            drainResponses(engine);
            if (engine.getG().gameResult) break;
        }

        expect(engine.getG().gameResult?.reason).toBe('RING_BEARER_KILLED');
    });

    it('Sam mort isDead en communauté (pas encore enterré) → applyGameEndIfNeeded', () => {
        const ring = {
            ...getCardById('11R1')!,
            instanceId: 'ring',
        };
        const sam: CardState = {
            ...getCardById('10P122')!,
            instanceId: 'sam',
            keywords: ['RING-BEARER', 'RING-BOUND'],
            wounds: 4,
            isDead: true,
            attachments: [ring],
        };
        const merry: CardState = {
            ...getCardById('1C303')!,
            instanceId: 'merry',
        };
        const G = createGameState({
            setupState: {
                bids: { '0': 0, '1': 0 },
                mulligans: { '0': false, '1': false },
                step: 'COMPLETE',
            },
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [sam, merry],
                    profile: {
                        name: 'Raphaël',
                        avatar: '',
                        faction: 'freePeoples',
                    },
                }),
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Tom',
                        avatar: '',
                        faction: 'shadow',
                    },
                }),
            },
        });

        expect(checkRingBearerKilledLoss(G)).toBe(true);
        expect(G.gameResult?.reason).toBe('RING_BEARER_KILLED');
    });

    it('CHARACTER_DIES ouvert bloque ; autre fenêtre (WINS) n’empêche pas la fin', () => {
        const sam: CardState = {
            ...getCardById('10P122')!,
            instanceId: 'sam',
            keywords: ['RING-BEARER'],
            isDead: true,
            wounds: 4,
            attachments: [{ ...getCardById('11R1')!, instanceId: 'ring' }],
        };
        const G = createGameState({
            setupState: {
                bids: { '0': 0, '1': 0 },
                mulligans: { '0': false, '1': false },
                step: 'COMPLETE',
            },
            pendingEvent: {
                type: 'CHARACTER_DIES',
                deadCardId: 'sam',
            },
            responseWindow: {
                isOpen: true,
                activePlayerId: '0',
                title: 'RÉPONSE',
                message: 'test',
                canPass: true,
                passesCount: 0,
                usedResponseKeys: [],
            },
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [sam],
                    profile: {
                        name: 'Raphaël',
                        avatar: '',
                        faction: 'freePeoples',
                    },
                }),
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Tom',
                        avatar: '',
                        faction: 'shadow',
                    },
                }),
            },
        });

        expect(applyGameEndIfNeeded(G)).toBe(false);
        expect(G.gameResult).toBeUndefined();

        // Après CHARACTER_DIES : fenêtre WINS encore ouverte → fin quand même.
        G.pendingEvent = {
            type: 'WINS_SKIRMISH',
            winnerIds: ['wk'],
            skirmishId: 'sk1',
        };
        expect(applyGameEndIfNeeded(G)).toBe(true);
        expect(G.gameResult?.reason).toBe('RING_BEARER_KILLED');
    });
});
