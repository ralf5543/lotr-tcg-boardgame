import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';
import { Card } from '../Card';
import { useDrag } from '../../../../contexts/DragContext';

interface PlayerAreaProps {
    playerId: string; // "0" (FP) ou "1" (Ombre)
    deckCount: number;
    fellowshipArea: CardType[];
    supportArea: CardType[];
    isOpponent?: boolean;
    moves: any;
}

let isProcessingDrop = false;

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId,
    deckCount,
    fellowshipArea,
    supportArea,
    isOpponent = false,
    moves,
}) => {
    const isFreePeoplesPlayer = playerId === '0';
    const { activeTargetId, registerTarget, startDrag, dragged } = useDrag();

     // 💡 1. DECLARATION DE movesRef
    const movesRef = React.useRef(moves);
    React.useEffect(() => {
        movesRef.current = moves;
    }, [moves]);

    // 💡 2. DECLARATION DE companionsRef
    const companionsRef = React.useRef<CardType[]>(fellowshipArea);
    React.useEffect(() => {
        companionsRef.current = fellowshipArea;
    }, [fellowshipArea]);

    React.useEffect(() => {
        companionsRef.current = fellowshipArea;
    }, [fellowshipArea]);

    React.useEffect(() => {
    const handlePhysicalDrop = (e: Event) => {
    if (isOpponent) return;

    const customEvent = e as CustomEvent;
    const { draggedCard, targetId } = customEvent.detail || {};
    
    console.log('📦 [DROP EVENT DETAIL]:', { draggedCard, targetId });

    if (!targetId || !draggedCard) return;
    const { index, card, origin } = draggedCard;

    // --- CASE A : DROP SUR UN COMPAGNON (ATTACHEMENT) ---
    // Si targetId n'est pas la zone globale 'fellowshipArea' mais l'ID d'une carte spécifique
    if (origin === 'HAND' && targetId !== 'fellowshipArea' && targetId !== 'supportArea') {
        console.log('📎 [TRY ATTACH]:', { cardIndex: index, targetCardId: targetId });
        moves.attachCard(index, targetId);
        return;
    }

    // --- CASE B : DROP DEPUIS LA MAIN (JOUER UNE CARTE) ---
    if (origin === 'HAND' && targetId === 'fellowshipArea') {
        console.log('🃏 [TRY PLAY CARD]:', { cardIndex: index });
        moves.playCard(index);
        return;
    }

    // --- CASE C : REORDER SUR LE PLATEAU ---
    if (origin === 'BOARD') {
    const currentList = fellowshipArea || [];
    
    // 1. Déterminer l'index cible
    let toIndex = -1;

    // Si on a lâché sur une carte spécifique
    if (targetId !== 'fellowshipArea') {
        toIndex = currentList.findIndex(
            (c) => c && (c.id === targetId || (c as any).card?.id === targetId)
        );
    } else {
        // Si on lâche dans le vide de la zone, on envoie à la fin
        toIndex = currentList.length - 1;
    }

    console.log('🔄 [REORDER CHECK]', {
        fromIndex: index,
        toIndexCalculated: toIndex,
        targetIdReceived: targetId,
        currentListLength: currentList.length,
        currentIds: currentList.map(c => c?.id)
    });

    if (index === undefined || toIndex === -1) {
        console.warn('⚠️ [REORDER ABORTED] Index source ou cible invalide');
        return;
    }

    moves.reorderFellowship({ fromIndex: index, toIndex });
}
};

    window.addEventListener('card-dropped', handlePhysicalDrop);
    return () => window.removeEventListener('card-dropped', handlePhysicalDrop);
}, [isOpponent, moves, fellowshipArea]);

    // 1. Rendu du composant Zone Communauté (Fellowship)
    const renderFellowship = () => {

        if (isFreePeoplesPlayer) {
            return (
                <S.Fellowship
                    className="fellowship-active"
                    $borderColor="#3498db"
                    ref={(el) =>
                        !isOpponent && registerTarget('fellowshipArea', el)
                    }
                >
                    <S.ZoneTitle color="#3498db">
                        🛡️ Compagnons des Peuples Libres{' '}
                        {isOpponent ? "(Cibles de l'Ombre)" : '(Ta Compagnie)'}
                    </S.ZoneTitle>
                    <S.CardRow>
                        {(fellowshipArea || []).length === 0 && (
                            <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                        )}
                        {(fellowshipArea || []).map(
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
                        <Card size="sm" card={card} />
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
