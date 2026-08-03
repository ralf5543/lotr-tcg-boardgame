import React from 'react';
import type { CardState, CardKeyword } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import type { CardSignet } from '../../../../game/types';
import { FormattedText } from '../../../../utils/FormattedText';
import { KeywordBadge } from '../KeywordBadge';
import { useDrag } from '../../../../contexts/DragContext';
import {
    getEffectiveVitality,
    getEffectiveStrength,
} from '../../../../utils/cardStats';

interface CardProps {
    card: CardState;
    isPlayable?: boolean;
    isDraggable?: boolean;
    index?: number;
    currentSiteIndex?: number;
    roaming?: number;
    signet?: CardSignet;
    size?: 'sm' | 'md' | 'lg';
    isRingBearer?: boolean;
    isWounded?: boolean;
    isOpponent?: boolean;
}

export const Card: React.FC<CardProps> = ({
    card,
    isPlayable,
    size = 'md',
    isDraggable = false,
    index,
    isRingBearer: isRingBearerProp,
    currentSiteIndex,
    isWounded = false,
    isOpponent = false,
}) => {
    const isShadow = card.kind === 'SHADOW';
    const { setHoveredCard } = useHoverCard();

    // 🟢 Utilisation de CardKeyword au lieu de any
    const isRingBearer =
        isRingBearerProp ??
        card.keywords?.includes('RING-BEARER' as CardKeyword);

    const handleMouseEnter = () => {
        if (size !== 'lg') setHoveredCard(card);
    };

    const handleMouseLeave = () => {
        if (size !== 'lg') setHoveredCard(null);
    };

    const { startDrag } = useDrag();

    const handleDragStart = (e: React.DragEvent) => {
        if (!isDraggable || isPlayable === false || index === undefined) {
            e.preventDefault();
            return;
        }
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

    const translatedType = TRANSLATIONS.type[card.type];
    // 🟢 Vérification que card.subtype est défini avant d'accéder aux traductions
    const translatedSubtype = card.subtype
        ? TRANSLATIONS.subtype[card.subtype]
        : null;
    const translatedRace = card.race ? TRANSLATIONS.race[card.race] : null;

    const translatedKeywords = card.keywords
        ?.map((kw) => TRANSLATIONS.keyword[kw]?.label || kw)
        .join(', ');

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isDraggable || isPlayable === false || index === undefined) return;
        e.preventDefault();
        startDrag(card, index, e);
        setHoveredCard(null);
    };

    const isCharacter = ['COMPANION', 'ALLY', 'MINION'].includes(card.type);

    const isRoaming =
        typeof currentSiteIndex === 'number' &&
        card.kind === 'SHADOW' &&
        card.type === 'MINION' &&
        typeof card.roaming === 'number' &&
        card.roaming > currentSiteIndex + 1;

    const effectiveVitality = getEffectiveVitality(card);
    const effectiveStrength = getEffectiveStrength(card);

    // 🟢 État permanent : est-ce que la carte a des blessures ?
    const hasWounds = (card.wounds || 0) > 0;

    return (
        <S.CardContainer
            $culture={card.culture}
            $type={card.type}
            $kind={card.kind}
            $isShadow={isShadow}
            $isPlayable={isPlayable}
            $size={size}
            $isRoaming={isRoaming}
            $isWounded={isWounded}
            $isOpponent={isOpponent}
            key={`${card.id}-wounds-${card.wounds || 0}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDragStart={isDraggable ? handleDragStart : undefined}
            onPointerDown={handlePointerDown}
            data-draggable={isDraggable ? 'true' : undefined}
        >
            {isCharacter &&
                size === 'sm' &&
                card.keywords &&
                card.keywords.length > 0 && (
                    <S.KeywordsContainer>
                        {card.keywords.map((kw) => (
                            <KeywordBadge key={kw} keyword={kw} size={18} />
                        ))}
                    </S.KeywordsContainer>
                )}

            {hasWounds && (
                <S.WoundsOverlay>
                    {Array.from({ length: card.wounds! }).map((_, i) => (
                        <S.WoundToken
                            key={i}
                            width="20px"
                            src="interface/tokens/token_blood.webp"
                        />
                    ))}
                </S.WoundsOverlay>
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
                <S.Visual src={card.imageUrl} alt={card.title} />
            </S.VisualContainer>

            {size !== 'sm' && (
                <S.CardTypes $type={card.type}>
                    <S.CardType $type={card.type}>{translatedType}</S.CardType>
                    {card.subtype && translatedSubtype && (
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
                {size !== 'sm' && translatedKeywords && (
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
                <S.StrengthBadge>
                    {size !== 'sm' ? (
                        card.strength
                    ) : (
                        <>
                            {card.type === 'POSSESSION_CHARACTER' ||
                            card.type === 'ARTIFACT_CHARACTER' ||
                            card.type === 'CONDITION_CHARACTER'
                                ? `${card.strength > 0 ? '+' : ''}${card.strength}`
                                : effectiveStrength}
                        </>
                    )}
                </S.StrengthBadge>
            )}

            {card.vitality !== undefined && (
                <S.VitalityBadge>
                    {size !== 'sm' ? (
                        card.strength
                    ) : (
                        <>
                            {card.type === 'POSSESSION_CHARACTER' ||
                            card.type === 'ARTIFACT_CHARACTER' ||
                            card.type === 'CONDITION_CHARACTER'
                                ? `${card.vitality > 0 ? '+' : ''}${card.vitality}`
                                : effectiveVitality}
                        </>
                    )}
                </S.VitalityBadge>
            )}

            {card.roaming !== undefined && (
                <S.RoamingNumber $isRoaming={isRoaming}>
                    {card.roaming}

                    {isRoaming && size === 'md' && (
                        <S.RoamingBadge title="Pénalité d'errance (+2 Crépuscule)">
                            +2
                        </S.RoamingBadge>
                    )}
                </S.RoamingNumber>
            )}
            {card.resistance !== undefined &&
                !(card.signet && size === 'lg') && (
                    /* 🟢 Conversion explicite en booléen strict avec Boolean() */
                    <S.CardResistance $isRingBearer={Boolean(isRingBearer)}>
                        {card.resistance}
                    </S.CardResistance>
                )}
            {card.signet !== undefined && (
                <S.CardSignet $signet={card.signet} />
            )}
            {card.subtype !== undefined && size === 'sm' && (
                <S.AttachmentSubtype
                    src={`/interface/pictos/${card.subtype}.webp`}
                    alt={card.subtype}
                    draggable={false}
                    width="16px"
                />
            )}
        </S.CardContainer>
    );
};
