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
    moves: any; // Ajout propre dans l'interface des Props
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId,
    deckCount,
    freePeoplesArea,
    supportArea,
    isOpponent = false,
    moves,
}) => {
    const { activeTargetId, registerTarget } = useDrag();

    // Écouteur global du drop physique (PointerEvents)
    React.useEffect(() => {
        const handlePhysicalDrop = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { draggedCard, targetId } = customEvent.detail;

            // Si le drop n'a pas eu lieu sur une zone/carte valide, on s'arrête
            if (!targetId) return;

            const { index, card } = draggedCard;

            console.log("PlayerArea a intercepté le drop !", { index, card, targetId });

            // CAS 1 : On lâche un Compagnon directement sur la Ligne de Front globale
            if (targetId === 'freePeoplesArea') {
                if (card.kind === 'FREE_PEOPLES' && card.subType === 'COMPANION') {
                    console.log(`Exécution de moves.playCard(${index}) !`);
                    moves.playCard(index);
                } else {
                    console.log("Seuls les compagnons du Peuple Libre peuvent aller sur la ligne de front !");
                }
                return;
            }

            // CAS 2 : On cherche si on a lâché une possession sur un compagnon précis de notre zone
            const targetCompanion = freePeoplesArea.find(c => c.id === targetId);
            if (!targetCompanion) return;

            // Validation de l'attachement
            if (card.subType !== 'POSSESSION') {
                console.log("Seules les possessions peuvent être attachées à un compagnon.");
                return;
            }

            // Validation de la race
            if (card.gameText.toLowerCase().includes("sur un hobbit") && targetCompanion.race !== 'HOBBIT') {
                alert(`Impossible : cette possession ne peut être attachée qu'à un Hobbit, pas à ${targetCompanion.title} !`);
                return;
            }

            // Tout est bon : on attache !
            moves.attachCard(cardIndex, targetCompanion.id);
        };

        window.addEventListener('card-dropped', handlePhysicalDrop);
        return () => {
            window.removeEventListener('card-dropped', handlePhysicalDrop);
        };
    }, [freePeoplesArea, moves]);

    // Détermine si le drag en cours survole la ligne de front globale (quand elle est vide)
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
                    // On enregistre la ligne de front globale pour pouvoir y poser de nouvelles cartes compagnons
                    ref={(el) => registerTarget('freePeoplesArea', el)}
                    style={{
                        backgroundColor: isFrontLineHovered ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
                        borderStyle: isFrontLineHovered ? 'dashed' : 'solid',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <S.ZoneTitle color="#3498db">
                        🛡️ Ligne de Front (Compagnons)
                    </S.ZoneTitle>
                    <S.CardRow>
                        {(freePeoplesArea || []).length === 0 && !isFrontLineHovered && (
                            <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                        )}
                        {(freePeoplesArea || []).map((companion) => {
                            // Détection si la carte dragguée "mord" sur ce compagnon
                            const isHoveredByDrag = activeTargetId === companion.id;

                            return (
                                <S.CharacterStack key={companion.id}>
                                    {/* Le wrapper de détection de collision autour du compagnon */}
                                    <div 
                                        ref={(el) => registerTarget(companion.id, el)}
                                        style={{
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                            // Halo vert si une possession est survolée au-dessus de lui !
                                            boxShadow: isHoveredByDrag ? '0 0 25px #2ecc71' : 'none',
                                            transform: isHoveredByDrag ? 'scale(1.05)' : 'none',
                                        }}
                                    >
                                        <Card card={companion} />
                                    </div>

                                    {/* Ses équipements attachés */}
                                    {companion.attachments?.map((attachment, idx) => (
                                        <S.AttachmentWrapper key={attachment.id} $index={idx}>
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
                            
                            {/* Les alliés dans la zone de soutien peuvent aussi recevoir des attachements ! */}
                            {card.attachments?.map((attachment, idx) => (
                                <S.AttachmentWrapper key={attachment.id} $index={idx}>
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