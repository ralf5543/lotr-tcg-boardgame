import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';
import { Card } from '../Card';
import { useDrag } from '../../../../contexts/DragContext';

interface PlayerAreaProps {
    playerId: string;
    deckCount: number;
    freePeoplesArea: CardType[];
    supportArea: CardType[];
    isOpponent?: boolean;
    moves: any;
}

// Verrou de sécurité global pour empêcher le double-déclenchement (anti-debounce)
let isProcessingDrop = false;

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId,
    deckCount,
    freePeoplesArea,
    supportArea,
    isOpponent = false,
    moves,
}) => {
    const { activeTargetId, registerTarget } = useDrag();

    // Référence mutable synchronisée pour toujours avoir l'état le plus récent de la zone
    const companionsRef = React.useRef<CardType[]>(freePeoplesArea);
    React.useEffect(() => {
        companionsRef.current = freePeoplesArea;
    }, [freePeoplesArea]);

    // Gestionnaire de drop (PointerEvents)
    React.useEffect(() => {
        const handlePhysicalDrop = (e: Event) => {
            // Seule la zone du joueur actif doit intercepter ses propres drops
            if (isOpponent) return;

            // Protection anti-doublon
            if (isProcessingDrop) return;

            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail;

            if (!targetId) return;

            const { index, card } = draggedCard;

            // Sécurité : Une zone Peuple Libre n'accepte que des cartes Peuple Libre
            if (
                targetId === 'freePeoplesArea' &&
                card.kind !== 'FREE_PEOPLES'
            ) {
                return;
            }

            // Verrouillage temporaire
            isProcessingDrop = true;
            setTimeout(() => {
                isProcessingDrop = false;
            }, 100);

            // CAS 1 : Pose d'un Compagnon directement sur la Ligne de Front
            if (targetId === 'freePeoplesArea') {
                if (
                    card.kind === 'FREE_PEOPLES' &&
                    card.subType === 'COMPANION'
                ) {
                    moves.playCard(index);
                }
                return;
            }

            // CAS 2 : Attachement d'une Possession sur un compagnon précis
            const currentCompanions = companionsRef.current;
            const targetCompanion = currentCompanions.find(c => {
                if (!c) return false;
                return c.id === targetId || (c.card && c.card.id === targetId);
            });

            if (!targetCompanion) return;

            // Validation minimale de type
            if (card.subType !== 'POSSESSION') return;

            const targetCompanionId = targetCompanion.id || targetCompanion.card?.id;
            moves.attachCard(index, targetCompanionId);
        };

        window.addEventListener('card-dropped', handlePhysicalDrop);
        return () => {
            window.removeEventListener('card-dropped', handlePhysicalDrop);
        };
    }, [isOpponent, moves]);

    const isFrontLineHovered = activeTargetId === 'freePeoplesArea';

    return (
        <S.AreaContainer $isOpponent={isOpponent}>
            <S.MetaInfo $isOpponent={isOpponent}>
                {isOpponent
                    ? `🔴 ADVERSAIRE (Joueur ${playerId}) — Deck : ${deckCount} cartes`
                    : `🧙‍♂️ TOI (Joueur ${playerId})`}
            </S.MetaInfo>

            {/* 1. ZONE PEUPLE LIBRE */}
            {isOpponent ? (
                <S.MaskedZonePlaceholder>
                    🔒 Zone Peuple Libre masquée pendant le tour de l'Ombre
                </S.MaskedZonePlaceholder>
            ) : (
                <S.Zone
                    $borderColor="#3498db"
                    ref={(el) => registerTarget('freePeoplesArea', el)}
                    style={{
                        backgroundColor: isFrontLineHovered
                            ? 'rgba(52, 152, 219, 0.15)'
                            : 'transparent',
                        borderStyle: isFrontLineHovered ? 'dashed' : 'solid',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <S.ZoneTitle color="#3498db">
                        🛡️ Ligne de Front (Compagnons)
                    </S.ZoneTitle>
                    <S.CardRow>
                        {(freePeoplesArea || []).length === 0 &&
                            !isFrontLineHovered && (
                                <S.EmptyText>
                                    Aucun compagnon déployé.
                                </S.EmptyText>
                            )}
                        {(freePeoplesArea || []).map((companion) => {
                            const isHoveredByDrag = activeTargetId === companion.id;

                            return (
                                <S.CharacterStack key={companion.id}>
                                    <div
                                        ref={(el) => registerTarget(companion.id, el)}
                                        style={{
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isHoveredByDrag
                                                ? '0 0 25px #2ecc71'
                                                : 'none',
                                            transform: isHoveredByDrag
                                                ? 'scale(1.05)'
                                                : 'none',
                                        }}
                                    >
                                        <Card card={companion} size="sm" />
                                    </div>

                                    {/* Ses équipements attachés */}
                                    {companion.attachments?.map((attachment, idx) => (
                                        <S.AttachmentWrapper
                                            key={attachment.id}
                                            $index={idx}
                                        >
                                            <Card card={attachment} size="sm" />
                                        </S.AttachmentWrapper>
                                    ))}
                                </S.CharacterStack>
                            );
                        })}
                    </S.CardRow>
                </S.Zone>
            )}

            {/* 2. AIRE DE SOUTIEN */}
            <S.Zone $borderColor="#f39c12">
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

                            {/* Les alliés dans la zone de soutien peuvent aussi recevoir des attachements */}
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
            </S.Zone>
        </S.AreaContainer>
    );
};