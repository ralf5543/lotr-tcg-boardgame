import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';
import { useHoverCard } from '../../../../contexts/HoverCardContext';

interface CardProps {
    card: CardType;
    isPlayable?: boolean;
    isDraggable?: boolean;
    index?: number;
    size?: 'sm' | 'md' | 'lg'; // Ajout de la prop size
}

export const Card: React.FC<CardProps> = ({
    card,
    isPlayable,
    size = 'md',
    isDraggable = false,
    index,
}) => {
    const isShadow = card.kind === 'SHADOW';
    const { setHoveredCard } = useHoverCard();

    const handleMouseEnter = () => {
        if (size !== 'lg') {
            setHoveredCard(card);
        }
    };

    const handleMouseLeave = () => {
        if (size !== 'lg') {
            setHoveredCard(null);
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        if (index === undefined) return;

        const dragPayload = {
            cardIndex: index,
            cardId: card.id,
            kind: card.kind,
            subType: card.subType,
            race: card.race,
            gameText: card.gameText
        };

        // On injecte les données
        e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = 'move';

        // Optionnel : on coupe l'inspecteur géant au survol pour pas qu'il gêne la vue pendant le déplacement
        setHoveredCard(null);
    };

    // --- INTERPRÉTEUR DE TRADUCTION ---
    const translatedSubType = TRANSLATIONS.subType[card.subType];
    const translatedRace = card.race ? TRANSLATIONS.race[card.race] : null;
    const translatedKeyword = card.keyword ? TRANSLATIONS.keyword[card.keyword] : null;

    // Construction de la ligne de type (Ex: "Compagnon • Homme • Rôdeur")
    const typeLineElements = [translatedSubType, translatedRace].filter(
        Boolean
    ); // Retire les éléments undefined ou null

    const typeLine = typeLineElements.join(' • ');

    return (
        <S.CardContainer
            $culture={card.culture}
            $imageUrl={card.imageUrl}
            $isShadow={isShadow}
            $isPlayable={isPlayable}
            $size={size} // Transmis au style pour recalculer l'échelle !
            onMouseEnter={handleMouseEnter} // Détection du survol
            onMouseLeave={handleMouseLeave} // Fin du survol
            draggable={isDraggable}
            onDragStart={isDraggable ? handleDragStart : undefined}
        >
            <S.CardHeader>
                <S.TwilightBadge $isShadow={isShadow}>
                    {card.twilightCost}
                </S.TwilightBadge>
                <S.CardTitles>
                    <S.CardTitle>
                        {card.isUnique && '• '}
                        {card.title}
                    </S.CardTitle>
                    {card.subtitle && size === 'lg' && (
                        <S.CardSubtitle>{card.subtitle}</S.CardSubtitle>
                    )}
                </S.CardTitles>
            </S.CardHeader>

            <S.VisualContainer>
                <S.Visual src={card.imageUrl} alt={card.title} draggable={false} />
            </S.VisualContainer>

            <S.Type>{typeLine}</S.Type>

            <S.GameText $culture={card.culture}>
              {card.keyword && <p><strong>{translatedKeyword}</strong></p>}            
              <p>{card.gameText}</p>
            </S.GameText>

            {/* N'affiche la force et la vitalité que s'ils sont définis */}
            {(card.strength !== undefined || card.vitality !== undefined) && (
                <S.StatsRow>
                    {card.strength !== undefined && (
                        <S.StrengthBadge>{card.strength}</S.StrengthBadge>
                    )}
                    {card.vitality !== undefined && (
                        <S.VitalityBadge>{card.vitality}</S.VitalityBadge>
                    )}
                </S.StatsRow>
            )}
        </S.CardContainer>
    );
};
