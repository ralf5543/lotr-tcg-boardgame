import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';
import { Card } from '../Card';
import { useDrag } from '../../../../contexts/DragContext';

interface PlayerAreaProps {
    playerId: string; // "0" (FP) ou "1" (Ombre)
    deckCount: number;
    freePeoplesArea: CardType[];
    supportArea: CardType[];
    isOpponent?: boolean;
    moves: any;
}

let isProcessingDrop = false;

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId,
    deckCount,
    freePeoplesArea,
    supportArea,
    isOpponent = false,
    moves,
}) => {
    const isFreePeoplesPlayer = playerId === '0';
    const { activeTargetId, registerTarget, startDrag, dragged } = useDrag();

    const companionsRef = React.useRef<CardType[]>(freePeoplesArea);
    React.useEffect(() => {
        companionsRef.current = freePeoplesArea;
    }, [freePeoplesArea]);

    React.useEffect(() => {
        const handlePhysicalDrop = (e: Event) => {
            if (isOpponent) return;
            if (isProcessingDrop) return;

            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail;
            if (!targetId) return;

            const { index, card, origin } = draggedCard;

            isProcessingDrop = true;
            setTimeout(() => {
                isProcessingDrop = false;
            }, 100);

            // -------------------------------------------------------------
            // 1. DROPS VENANT DU PLATEAU (origin === 'BOARD')
            // -------------------------------------------------------------
            if (origin === 'BOARD') {
                // A. Déplacer sur la zone Fellowship elle-même (ex: mettre en fin de ligne)
                if (targetId === 'freePeoplesArea') {
                    const targetIndex = (freePeoplesArea || []).length - 1;
                    moves.reorderFellowship({
                        fromIndex: index,
                        toIndex: targetIndex,
                    });
                    return;
                }

                // B. Déplacer / Swapper sur un compagnon spécifique
                const currentCompanions = companionsRef.current || [];
                const targetCompanionIndex = currentCompanions.findIndex(
                    (c) => c && (c.id === targetId || c.card?.id === targetId)
                );

                if (targetCompanionIndex !== -1) {
                    moves.reorderFellowship({
                        fromIndex: index,
                        toIndex: targetCompanionIndex,
                    });
                    return;
                }

                // (Futurs cas 'BOARD' : déplacer une possession vers un autre compagnon, etc.)
                return;
            }

            // -------------------------------------------------------------
            // 2. DROPS VENANT DE LA MAIN (origin === 'HAND')
            // -------------------------------------------------------------
            if (targetId === 'freePeoplesArea') {
                if (
                    card.kind === 'FREE_PEOPLES' &&
                    card.subType === 'COMPANION'
                ) {
                    moves.playCard(index);
                }
                return;
            }

            // Attachement d'une possession depuis la main sur un compagnon
            const currentCompanions = companionsRef.current || [];
            const targetCompanion = currentCompanions.find(
                (c) => c && (c.id === targetId || c.card?.id === targetId)
            );
            if (!targetCompanion || card.subType !== 'POSSESSION') return;

            const targetCompanionId =
                targetCompanion.id || targetCompanion.card?.id;
            moves.attachCard(index, targetCompanionId);
        };

        window.addEventListener('card-dropped', handlePhysicalDrop);
        return () =>
            window.removeEventListener('card-dropped', handlePhysicalDrop);
    }, [isOpponent, moves, freePeoplesArea?.length]);

    const isFrontLineHovered = activeTargetId === 'freePeoplesArea';

    // 1. Rendu du composant Zone Communauté (Fellowship)
    const renderFellowship = () => {
        if (isFreePeoplesPlayer) {
            return (
                <S.Fellowship
                    className="fellowship-active"
                    $borderColor="#3498db"
                    ref={(el) =>
                        !isOpponent && registerTarget('freePeoplesArea', el)
                    }
                >
                    <S.ZoneTitle color="#3498db">
                        🛡️ Compagnons des Peuples Libres{' '}
                        {isOpponent ? "(Cibles de l'Ombre)" : '(Ta Compagnie)'}
                    </S.ZoneTitle>
                    <S.CardRow>
                        {(freePeoplesArea || []).length === 0 && (
                            <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                        )}
                        {(freePeoplesArea || []).map(
                            (companion, companionIdx) => {
                                const isBeingDragged =
                                    dragged?.card.id === companion.id;

                                return (
                                    <S.CharacterStack
                                        key={companion.id}
                                        style={{
                                            opacity: isBeingDragged ? 0.3 : 1,
                                        }}
                                    >
                                        <div
                                            ref={(el) =>
                                                !isOpponent &&
                                                registerTarget(companion.id, el)
                                            }
                                            onPointerDown={(e) => {
                                                if (isOpponent) return;
                                                if (e.button !== 0) return;
                                                e.stopPropagation();

                                                // Launch drag avec origin = 'BOARD'
                                                startDrag(
                                                    companion,
                                                    companionIdx,
                                                    e,
                                                    'BOARD'
                                                );
                                            }}
                                            style={{
                                                cursor: isOpponent
                                                    ? 'default'
                                                    : 'grab',
                                            }}
                                        >
                                            <Card card={companion} size="sm" />
                                        </div>
                                        {companion.attachments?.map(
                                            (attachment, idx) => (
                                                <S.AttachmentWrapper
                                                    key={attachment.id}
                                                    $index={idx}
                                                >
                                                    <Card
                                                        card={attachment}
                                                        size="sm"
                                                    />
                                                </S.AttachmentWrapper>
                                            )
                                        )}
                                    </S.CharacterStack>
                                );
                            }
                        )}
                    </S.CardRow>
                </S.Fellowship>
            );
        }

        return (
            <S.FellowshipCollapsed>
                {/* Zone masquée/réduite car l'Ombre n'a pas de compagnons */}
            </S.FellowshipCollapsed>
        );
    };

    // 2. Rendu du composant Aire de Soutien (SupportArea)
    const renderSupportArea = () => (
        <S.SupportArea $borderColor="#f39c12" $isOpponent={isOpponent}>
            <S.ZoneTitle color="#f39c12">
                🎒 Aire de Soutien (Support Area)
            </S.ZoneTitle>
            <S.CardRow>
                {(supportArea || []).length === 0 && (
                    <S.EmptyText>Aire de soutien vide.</S.EmptyText>
                )}
                {(supportArea || []).map((card) => (
                    <S.CharacterStack key={card.id}>
                        <Card card={card} />
                        {card.attachments?.map((attachment, idx) => (
                            <S.AttachmentWrapper
                                key={attachment.id}
                                $index={idx}
                            >
                                <Card card={attachment} size="sm" />
                            </S.AttachmentWrapper>
                        ))}
                    </S.CharacterStack>
                ))}
            </S.CardRow>
        </S.SupportArea>
    );

    return (
        <S.AreaContainer $isOpponent={isOpponent}>
            <S.MetaInfo $isOpponent={isOpponent}>
                {isOpponent
                    ? `🔴 ADVERSAIRE (Joueur ${playerId}) — Deck : ${deckCount} cartes`
                    : `🧙‍♂️ TOI (Joueur ${playerId})`}
            </S.MetaInfo>

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
