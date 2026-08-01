import React, { useEffect } from 'react';
import type { CardState, CardType, GameState } from '../../../../game/types';
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
        reorderFellowship?: (data: { fromIndex: number; toIndex: number }) => void;
        selectSkirmish?: (id: string) => void;
    };
    skirmishes?: SkirmishEntry[];
    battlefield?: CardState[];
    isSkirmishPhase?: boolean;
    activeSkirmishId?: string;
    G: GameState;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId,
    deckCount: _deckCount, // 🟢 Préfixé par _ pour indiquer l'intention de le garder pour plus tard
    fellowshipArea,
    supportArea,
    isOpponent = false,
    moves,
    skirmishes = [],
    battlefield = [],
    isSkirmishPhase = false,
    activeSkirmishId,
    G,
}) => {
    const isFreePeoplesPlayer = playerId === '0';
    const { activeTargetId, registerTarget, startDrag, dragged } = useDrag();

    const cardSubtype = (dragged?.card as CardState)?.type as
        | CardType
        | undefined;

    useEffect(() => {
    const handleReorderDrop = (e: Event) => {
        if (isOpponent) return;

        const customEvent = e as CustomEvent;
        const { draggedCard, targetId } = customEvent.detail || {};

        if (!targetId || !draggedCard) return;
        const { index, origin } = draggedCard;

        if (origin === 'BOARD') {
            const currentList = fellowshipArea || [];
            
            // 🟢 Déclaration sans valeur initiale non consommée
            let targetIndex: number;

            if (targetId !== 'fellowshipArea') {
                targetIndex = currentList.findIndex(
                    (c) =>
                        c &&
                        (c.id === targetId ||
                            (c as { card?: { id: string } }).card?.id === targetId)
                );
            } else {
                targetIndex = currentList.length - 1;
            }

            if (index === undefined || targetIndex === -1) {
                return;
            }

            moves.reorderFellowship?.({ fromIndex: index, toIndex: targetIndex });
        }
    };

    window.addEventListener('card-dropped', handleReorderDrop);
    return () =>
        window.removeEventListener('card-dropped', handleReorderDrop);
}, [isOpponent, moves, fellowshipArea]);

    const renderFellowship = () => {
        if (isFreePeoplesPlayer) {
            const isFellowshipTargeted =
                !isOpponent &&
                activeTargetId === 'fellowshipArea' &&
                dragged?.orientation === 'portrait' &&
                canDropInFellowship(cardSubtype);

            const isCombatLocked = Boolean(
                G?.actionWindow?.isOpen && G?.activeSkirmishId
            );

            return (
                <S.Fellowship
                    className="fellowship-active"
                    $borderColor="#3498db"
                    $isTargeted={isFellowshipTargeted}
                    ref={(el) => {
                        // 🟢 Callback de ref safe sans retour de valeur
                        if (!isOpponent) {
                            registerTarget('fellowshipArea', el);
                        }
                    }}
                >
                    <S.CardRow>
                        {(fellowshipArea || []).length === 0 && (
                            <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                        )}
                        {(fellowshipArea || []).map(
                            (companion, companionIdx) => {
                                const skirmish = skirmishes.find(
                                    (s) => s.companionId === companion.id
                                );
                                const assignedMinions = battlefield.filter(
                                    (m) => skirmish?.minionIds?.includes(m.id)
                                );

                                // ID du combat (si non présent sur skirmish, fallback sur l'ID généré)
                                const skirmishId =
                                    skirmish?.id || `skirmish_${companion.id}`;

                                return (
                                    <BoardCharacterStack
                                        key={companion.id}
                                        character={companion}
                                        index={companionIdx}
                                        isOpponent={isOpponent}
                                        assignedMinions={assignedMinions}
                                        isSkirmishPhase={isSkirmishPhase}
                                        skirmishId={skirmishId}
                                        lastWoundedCardIds={
                                            G?.lastWoundedCardIds
                                        }
                                        isSelectedSkirmish={
                                            activeSkirmishId === skirmishId
                                        }
                                        onSelectSkirmish={(id) => {
                                            // 🛑 Bloque la bascule de sélection si un combat est verrouillé
                                            if (isCombatLocked) return;

                                            moves.selectSkirmish?.(id);
                                        }}
                                        onStartDrag={(e) => {
                                            if (isOpponent || e.button !== 0)
                                                return;
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
                            }
                        )}
                    </S.CardRow>
                </S.Fellowship>
            );
        }

        return <S.FellowshipCollapsed />;
    };

    const renderSupportArea = () => {
        const isSupportTargeted =
            !isOpponent &&
            activeTargetId === 'supportArea' &&
            dragged?.orientation === 'portrait' &&
            canDropInSupportArea(cardSubtype);

        return (
            <S.SupportArea
                $borderColor="#f39c12"
                $isOpponent={isOpponent}
                $isTargeted={isSupportTargeted}
                ref={(el) => {
                    // 🟢 Callback de ref safe sans retour de valeur
                    if (!isOpponent) {
                        registerTarget('supportArea', el);
                    }
                }}
            >
                <S.ZoneTitle color="#f39c12">
                    🎒 Aire de Soutien (Support Area)
                </S.ZoneTitle>
                <S.CardRow>
                    {(supportArea || []).length === 0 && (
                        <S.EmptyText>Aire de soutien vide.</S.EmptyText>
                    )}
                    {(supportArea || []).map((card, cardIdx) => (
                        <S.CharacterStack
                            key={card.id}
                            data-draggable={!isOpponent ? 'true' : undefined}
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
                            />
                        </S.CharacterStack>
                    ))}
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