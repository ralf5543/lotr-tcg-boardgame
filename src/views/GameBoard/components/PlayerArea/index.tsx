import React, { useEffect } from 'react';
import type { CardState, CardType, CardSubtype, GameState } from '../../../../game/types';
import type { BoardProps } from 'boardgame.io/react';
import * as S from './styles';
import { Card } from '../Card';
import { useDrag } from '../../../../contexts/DragContext';
import { BoardCharacterStack } from '../BoardCharacterStack';
import {
    canDropInSupportArea,
    canDropInFellowship,
} from '../../../../utils/routingDragNDrop';

interface SkirmishEntry {
    id?: string;
    companionId?: string;
    minionIds?: string[];
}

interface PlayerAreaProps {
    playerId: string;
    deckCount: number;
    fellowshipArea: CardState[];
    supportArea: CardState[];
    isOpponent?: boolean;
    moves: BoardProps<GameState>['moves'] & {
        reorderFellowship?: (data: {
            fromIndex: number;
            toIndex: number;
        }) => void;
        selectSkirmish?: (id: string) => void;
    };
    skirmishes?: SkirmishEntry[];
    battlefield?: CardState[];
    isSkirmishPhase?: boolean;
    activeSkirmishId?: string;
    G: GameState;
    isFaceDown?: boolean;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId: _playerId,
    deckCount: _deckCount,
    fellowshipArea = [],
    supportArea = [],
    isOpponent = false,
    moves,
    skirmishes = [],
    battlefield = [],
    isSkirmishPhase = false,
    activeSkirmishId,
    G,
}) => {
    const { activeTargetId, registerTarget, startDrag, dragged } = useDrag();


    // 🟢 Extraire correctement le type ET le subtype pour le router de Drag
    const cardType = (dragged?.card as CardState)?.type as CardType | undefined;
    const cardSubtype = (dragged?.card as CardState)?.subtype as CardSubtype | undefined;

    // 🟢 FARDEAUX : Récupération dynamique spécifique au joueur
    const isFP = _playerId === G?.fpPlayerId;
    const playerBurdens = isFP ? (G?.players?.[_playerId]?.burdens ?? 0) : 0;

    // Gestion du Drag & Drop pour réordonner sa propre compagnie
    useEffect(() => {
        if (isOpponent) return;

        const handleReorderDrop = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail || {};

            if (!targetId || !draggedCard) return;
            const { index, origin } = draggedCard;

            if (origin === 'BOARD') {
                const currentList = fellowshipArea || [];
                let targetIndex: number;

                if (targetId !== 'fellowshipArea') {
                    targetIndex = currentList.findIndex(
                        (c) =>
                            c &&
                            (c.id === targetId ||
                                (c as { card?: { id: string } }).card?.id ===
                                    targetId)
                    );
                } else {
                    targetIndex = currentList.length - 1;
                }

                if (index === undefined || targetIndex === -1) {
                    return;
                }

                moves.reorderFellowship?.({
                    fromIndex: index,
                    toIndex: targetIndex,
                });
            }
        };

        window.addEventListener('card-dropped', handleReorderDrop);
        return () =>
            window.removeEventListener('card-dropped', handleReorderDrop);
    }, [isOpponent, moves, fellowshipArea]);

    const renderFellowship = () => {
        const isFellowshipTargeted =
            !isOpponent &&
            activeTargetId === 'fellowshipArea' &&
            dragged?.orientation === 'portrait' &&
            canDropInFellowship(cardType);

        const isCombatLocked = Boolean(
            G?.actionWindow?.isOpen && G?.activeSkirmishId
        );

        const playerBurdens = G?.players?.[_playerId]?.burdens ?? 0;

        return (
            <S.Fellowship
                className="fellowship-active"
                $borderColor="#3498db"
                $isTargeted={isFellowshipTargeted}
                $isOpponent={isOpponent}
                ref={(el) => {
                    if (!isOpponent && el) {
                        registerTarget('fellowshipArea', el);
                    }
                }}
            >
                <S.ZoneTitle color="#3498db">
                    🛡️ Compagnie (Fellowship) {isOpponent ? '(Adverse)' : ''}
                </S.ZoneTitle>
                <S.CardRow>
                    {fellowshipArea.length === 0 && (
                        <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                    )}
                    {fellowshipArea.map((companion, companionIdx) => {
                        const skirmish = skirmishes.find(
                            (s) => s.companionId === companion.id
                        );
                        const assignedMinions = battlefield.filter((m) =>
                            skirmish?.minionIds?.includes(m.id)
                        );

                        const skirmishId =
                            skirmish?.id || `skirmish_${companion.id}`;

                        const shouldBeFaceDown = isOpponent
                            ? (companion.isFaceDown ?? false)
                            : false;

                        return (
                            <BoardCharacterStack
                                key={companion.id}
                                character={companion}
                                index={companionIdx}
                                isOpponent={isOpponent}
                                assignedMinions={assignedMinions}
                                isSkirmishPhase={isSkirmishPhase}
                                skirmishId={skirmishId}
                                isFaceDown={shouldBeFaceDown}
                                burdens={playerBurdens}
                                lastWoundedCardIds={G?.lastWoundedCardIds}
                                isSelectedSkirmish={
                                    activeSkirmishId === skirmishId
                                }
                                onSelectSkirmish={(id) => {
                                    if (isCombatLocked) return;
                                    moves.selectSkirmish?.(id);
                                }}
                                onStartDrag={(e) => {
                                    if (isOpponent || e.button !== 0) return;
                                    e.stopPropagation();
                                    startDrag(
                                        companion,
                                        companionIdx,
                                        e,
                                        'BOARD',
                                        'portrait'
                                    );
                                }}
                            />
                        );
                    })}
                </S.CardRow>
            </S.Fellowship>
        );
    };

    const renderSupportArea = () => {
        const isSupportTargeted =
            !isOpponent &&
            activeTargetId === 'supportArea' &&
            dragged?.orientation === 'portrait' &&
            canDropInSupportArea(cardType, cardSubtype);

        return (
            <S.SupportArea
                $borderColor="#f39c12"
                $isOpponent={isOpponent}
                $isTargeted={isSupportTargeted}
                ref={(el) => {
                    if (!isOpponent && el) {
                        registerTarget('supportArea', el);
                    }
                }}
            >
                <S.ZoneTitle color="#f39c12">
                    🎒 Aire de Soutien (Support Area)
                </S.ZoneTitle>
                <S.CardRow>
                    {supportArea.length === 0 && (
                        <S.EmptyText>Aire de soutien vide.</S.EmptyText>
                    )}
                    {supportArea.map((card, cardIdx) => {
                        const shouldBeFaceDown = isOpponent
                            ? (card.isFaceDown ?? false)
                            : false;

                        return (
                            <S.CharacterStack
                                key={card.id}
                                data-draggable={
                                    !isOpponent ? 'true' : undefined
                                }
                            >
                                <Card
                                    size="sm"
                                    card={card}
                                    isDraggable={!isOpponent}
                                    index={cardIdx}
                                    isWounded={G.lastWoundedCardIds?.includes(
                                        card.id
                                    )}
                                    isOpponent={isOpponent}
                                    isFaceDown={shouldBeFaceDown}
                                    burdens={playerBurdens}
                                />
                            </S.CharacterStack>
                        );
                    })}
                </S.CardRow>
            </S.SupportArea>
        );
    };

    return (
        <S.AreaContainer $isOpponent={isOpponent}>
            {isOpponent ? (
                <>
                    {renderSupportArea()}
                    {renderFellowship()}
                </>
            ) : (
                <>
                    {renderFellowship()}
                    {renderSupportArea()}
                </>
            )}
        </S.AreaContainer>
    );
};