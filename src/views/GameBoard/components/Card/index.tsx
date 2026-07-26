import React from 'react';
import type { CardState } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import type { CardSignet } from '../../../../game/types';
import { FormattedText } from '../../../../utils/FormattedText';
import { KeywordBadge } from '../KeywordBadge';

interface CardProps {
    card: CardState;
    isPlayable?: boolean;
    isDraggable?: boolean;
    index?: number;
    roaming?: number;
    signet?: CardSignet;
    size?: 'sm' | 'md' | 'lg';
    isRingBearer?: boolean;
}

export const Card: React.FC<CardProps> = ({
    card,
    isPlayable,
    size = 'md',
    isDraggable = false,
    index,
    isRingBearer: isRingBearerProp,
}) => {
    const isShadow = card.kind === 'SHADOW';
    const { setHoveredCard } = useHoverCard();

    // 🟢 Détection automatique via les keywords OU via la prop explicite
    const isRingBearer =
        isRingBearerProp ?? card.keywords?.includes('RING-BEARER' as any);

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
            type: card.type,
            race: card.race,
            gameText: card.gameText,
            loreText: card.loreText,
        };

        e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = 'move';
        setHoveredCard(null);
    };

    // --- INTERPRÉTEUR DE TRADUCTION ---
    const translatedType = TRANSLATIONS.type[card.type];
    const translatedSubtype = TRANSLATIONS.subtype[card.subtype];
    const translatedRace = card.race ? TRANSLATIONS.race[card.race] : null;

    const translatedKeywords = card.keywords
        ?.map((kw) => TRANSLATIONS.keyword[kw].label || kw)
        .join(', ');

    // Construction de la ligne de type (Ex: "Compagnon • Homme • Rôdeur")
    const typeLineElements = [translatedType, translatedRace].filter(Boolean);

    const typeLine = typeLineElements.join(' • ');

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isDraggable || index === undefined) return;
        e.preventDefault();
        startDrag(card, index, e);
        setHoveredCard(null);
    };

    const isCharacter = ['COMPANION', 'ALLY', 'MINION'].includes(card.type);

    return (
        <S.CardContainer
            $culture={card.culture}
            $type={card.type}
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
            {isCharacter && size === 'sm' && card.keywords && card.keywords.length > 0 && (
            <S.KeywordsContainer>
                {card.keywords.map((kw) => (
                    <KeywordBadge key={kw} keyword={kw} size={18} />
                ))}
            </S.KeywordsContainer>
        )}
            <S.CardHeader>
                {size !== 'sm' && (
                    <S.TwilightBadge $isShadow={isShadow}>
                        {card.twilightCost}
                    </S.TwilightBadge>
                )}
                <S.CardTitles $type={card.type}>
                    <S.CardTitle $type={card.type}>
                        {card.isUnique && '• '}
                        {card.title}
                    </S.CardTitle>
                    {card.subtitle && size !== 'sm' && (
                        <S.CardSubtitle $type={card.type}>
                            {card.subtitle}
                        </S.CardSubtitle>
                    )}
                </S.CardTitles>
            </S.CardHeader>

            <S.VisualContainer $type={card.type}>
                <S.Visual
                    src={card.imageUrl}
                    alt={card.title}
                    draggable={false}
                />
            </S.VisualContainer>

            {size !== 'sm' && (
                <S.CardTypes $type={card.type}>
                    <S.CardType $type={card.type}>{translatedType}</S.CardType>
                    {card.subtype && (
                        <S.CardType $type={card.subtype}>
                            <S.Separator>•</S.Separator>
                            {translatedSubtype}
                        </S.CardType>
                    )}
                    {card.race && (
                        <S.CardType $type={card.subtype}>
                            <S.Separator>•</S.Separator>
                            {translatedRace}
                        </S.CardType>
                    )}
                </S.CardTypes>
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
                {size === 'lg' && card.loreText && (
                    <S.LoreText>‟{card.loreText}”</S.LoreText>
                )}
            </S.TextContainer>

            {card.strength !== undefined && (
                <S.StrengthBadge>{card.strength}</S.StrengthBadge>
            )}
            {card.vitality !== undefined && (
                <S.VitalityBadge>{card.vitality}</S.VitalityBadge>
            )}
            {card.roaming !== undefined && (
                <S.RoamingNumber>{card.roaming}</S.RoamingNumber>
            )}
            {card.resistance !== undefined &&
                !(card.signet && size === 'lg') && (
                    <S.CardResistance $isRingBearer={isRingBearer}>
                        {card.resistance}
                    </S.CardResistance>
                )}
            {card.signet !== undefined && (
                <S.CardSignet $signet={card.signet} />
            )}
        </S.CardContainer>
    );
};
