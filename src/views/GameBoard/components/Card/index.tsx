import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import { useDrag } from '../../../../contexts/DragContext';
import type { CardSignet } from '../../../../game/types';
import { FormattedText } from '../../../../utils/FormattedText';

interface CardProps {
    card: CardType;
    isPlayable?: boolean;
    isDraggable?: boolean;
    index?: number;
    roaming?: number;
    signet?: CardSignet;
    size?: 'sm' | 'md' | 'lg';
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

    const { playerFaction, startDrag } = useDrag();

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
            gameText: card.gameText,
            loreText: card.loreText,
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

    const translatedKeywords = card.keywords
        ?.map((kw) => TRANSLATIONS.keyword[kw] || kw)
        .join(', ');

    // Construction de la ligne de type (Ex: "Compagnon • Homme • Rôdeur")
    const typeLineElements = [translatedSubType, translatedRace].filter(
        Boolean
    ); // Retire les éléments undefined ou null

    const typeLine = typeLineElements.join(' • ');

    const handlePointerDown = (e: React.PointerEvent) => {
        // Si la carte n'est pas draggable ou que l'index est aux fraises, on fait rien
        if (!isDraggable || index === undefined) return;

        // Empêche le navigateur de tenter ses comportements par défaut (sélection de texte, etc.)
        e.preventDefault();

        // C'est ici qu'on lance ton action personnalisée du DragContext !
        // (Tu as normalement une fonction dans ton DragProvider qui initialise le mouvement)
        startDrag(card, index, e);

        // On coupe l'inspecteur géant pour pas gêner
        setHoveredCard(null);
    };

    return (
        <S.CardContainer
            $culture={card.culture}
            $subType={card.subType}
            $kind={card.kind}
            $isShadow={isShadow}
            $isPlayable={isPlayable}
            $size={size}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDragStart={isDraggable ? handleDragStart : undefined}
            draggable={false}
            onPointerDown={handlePointerDown}
            data-draggable={isDraggable ? 'true' : undefined}
        >
            <S.CardHeader>
                {size !== 'sm' && (
                    <S.TwilightBadge $isShadow={isShadow}>
                        {card.twilightCost}
                    </S.TwilightBadge>
                )}
                <S.CardTitles $subType={card.subType}>
                    <S.CardTitle $subType={card.subType}>
                        {card.isUnique && '• '}
                        {card.title}
                    </S.CardTitle>
                    {card.subtitle && size !== 'sm' && (
                        <S.CardSubtitle $subType={card.subType}>
                            {card.subtitle}
                        </S.CardSubtitle>
                    )}
                </S.CardTitles>
            </S.CardHeader>

            <S.VisualContainer $subType={card.subType}>
                <S.Visual
                    src={card.imageUrl}
                    alt={card.title}
                    draggable={false}
                />
            </S.VisualContainer>
            {size !== 'sm' && (
                <S.CardType $subType={card.subType}>{typeLine}</S.CardType>
            )}

            <S.TextContainer>
                {translatedKeywords && (
                    <S.KeywordText>{translatedKeywords}.</S.KeywordText>
                )}

                {size !== 'sm' && (
                    <S.GameText>
                        <FormattedText text={card.gameText} />
                    </S.GameText>
                )}
                {size === 'lg' && <S.LoreText>{card.loreText}</S.LoreText>}
            </S.TextContainer>

            {/* N'affiche la force et la vitalité que s'ils sont définis */}
            {card.strength !== undefined && (
                <S.StrengthBadge>{card.strength}</S.StrengthBadge>
            )}
            {card.vitality !== undefined && (
                <S.VitalityBadge>{card.vitality}</S.VitalityBadge>
            )}
            {card.roaming !== undefined && (
                <S.RoamingNumber>{card.roaming}</S.RoamingNumber>
            )}
            {card.signet !== undefined && (
                <S.CardSignet $signet={card.signet}></S.CardSignet>
            )}
        </S.CardContainer>
    );
};
