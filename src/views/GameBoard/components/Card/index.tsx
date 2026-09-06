import React, { useState, useEffect, useRef } from 'react';
import type { CardState, CardKeyword, GameState } from '../../../../game/types';
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
    getEffectiveResistance,
} from '../../../../utils/cardStats';
import { getCardText } from '../../../../utils/i18n';
import type { SupportedLanguage } from '../../../../utils/i18n';
import { requiresAttachmentTarget } from '../../../../game/engine/canPlayCard';
import { getEffectiveKeywords } from '../../../../game/engine/keywords/keywordUtils';
import { canUseAbility } from '../../../../game/engine/canUseAbility';
import {
    cardOrAttachmentsHaveActionPhases,
    collectCardAbilities,
    formatAbilityLabel,
    abilityMatchesPhase,
} from '../../../../game/engine/abilities/collectAbilities';

interface CardImageProps {
    imageUrl?: string;
    alt: string;
    draggable?: boolean;
}

export const CardImage: React.FC<CardImageProps> = ({
    imageUrl,
    alt,
    draggable = false,
}) => {
    const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
    const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

    // Si la prop imageUrl change, on réinitialise le fallback directement pendant le rendu
    if (imageUrl !== prevImageUrl) {
        setPrevImageUrl(imageUrl);
        setFallbackSrc(null);
    }

    if (!imageUrl) {
        return (
            <S.Visual
                src="interface/lotr_cardback.webp"
                alt={alt}
                draggable={false}
            />
        );
    }

    const handleError = () => {
        const currentSrc = fallbackSrc || imageUrl;
        const basePath = currentSrc.replace(/\.(jpg|jpeg|png|webp)$/i, '');
        const currentExt = currentSrc
            .slice(currentSrc.lastIndexOf('.'))
            .toLowerCase();

        const nextExtMap: Record<string, string | null> = {
            '.jpg': '.webp',
            '.jpeg': '.webp',
            '.webp': '.png',
            '.png': null,
        };

        const nextExt = nextExtMap[currentExt];

        if (nextExt) {
            setFallbackSrc(`${basePath}${nextExt}`);
        } else {
            setFallbackSrc('interface/lotr_cardback.webp');
        }
    };

    return (
        <S.Visual
            src={fallbackSrc ?? imageUrl}
            alt={alt}
            draggable={draggable}
            onError={handleError}
        />
    );
};

interface CardProps {
    card: CardState;
    isPlayable?: boolean;
    isDraggable?: boolean;
    isPlayableEvent?: boolean;
    designationTargetIds?: string[];
    index?: number;
    currentSiteIndex?: number;
    roaming?: number;
    signet?: CardSignet;
    size?: 'sm' | 'md' | 'lg';
    isRingBearer?: boolean;
    isWounded?: boolean;
    isActionable?: boolean;
    isOverwhelmed?: boolean;
    G?: GameState;
    isDead?: boolean;
    isOpponent?: boolean;
    isDisabled?: boolean;
    burdens?: number;
    isFaceDown?: boolean;
    currentLang?: SupportedLanguage;
    phase?: string;
    playerID?: string;
    onActivateAbility?: (sourceInstanceId: string, abilityId: string) => void;
}

export const Card: React.FC<CardProps> = ({
    card,
    G,
    isPlayable,
    size = 'md',
    isDraggable = false,
    isPlayableEvent = false,
    designationTargetIds,
    index,
    isRingBearer: isRingBearerProp,
    currentSiteIndex,
    isWounded = false,
    isOverwhelmed = false,
    isDead = false,
    isOpponent = false,
    isDisabled = false,
    isActionable,
    burdens = 0,
    isFaceDown: isFaceDownProp,
    currentLang = 'fr',
    phase,
    playerID,
    onActivateAbility,
}) => {
    const { setHoveredCard } = useHoverCard();
    const { startDrag } = useDrag();

    const [isTakingDamage, setIsTakingDamage] = useState(false);
    const [isAbilityMenuOpen, setIsAbilityMenuOpen] = useState(false);
    const prevWoundsRef = useRef(card?.wounds || 0);

    useEffect(() => {
        if (!card) return;
        const currentWounds = card.wounds || 0;

        if (currentWounds > prevWoundsRef.current) {
            setIsTakingDamage(true);
            const timer = setTimeout(() => {
                setIsTakingDamage(false);
            }, 650); // 0.65s correspondant à la durée de l'animation CSS

            prevWoundsRef.current = currentWounds;
            return () => clearTimeout(timer);
        }

        prevWoundsRef.current = currentWounds;
    }, [card?.wounds]);

    if (!card) return null;

    const isFaceDown = Boolean(
        isOpponent && (isFaceDownProp || card?.isFaceDown)
    );

    const { title, subtitle, gameText, loreText } = getCardText(
        card,
        currentLang
    );

    // 🂠 CAS DE LA CARTE FACE CACHÉE
    if (isFaceDown) {
        return (
            <S.CardContainer
                $size={size}
                $isOpponent={isOpponent}
                $isDisabled={isDisabled}
                style={{ cursor: 'default', userSelect: 'none' }}
                onDragStart={(e) => e.preventDefault()}
            >
                <S.VisualContainer $type={card?.type}>
                    <S.Visual
                        src="interface/lotr_cardback.webp"
                        alt="Carte masquée"
                        draggable={false}
                    />
                </S.VisualContainer>
            </S.CardContainer>
        );
    }

    const isShadow = card.kind === 'SHADOW';

    const isRingBearer =
        isRingBearerProp ??
        (Array.isArray(card.keywords) &&
            card.keywords.includes('RING-BEARER' as CardKeyword));

    const handleMouseEnter = () => {
        if (size !== 'lg') setHoveredCard(card);
    };

    const handleMouseLeave = () => {
        if (size !== 'lg') setHoveredCard(null);
    };

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
            gameText: gameText,
            loreText: loreText,
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = 'move';
        setHoveredCard(null);
    };

    const translatedType = card.type
        ? TRANSLATIONS.type[card.type] || card.type
        : null;

    const translatedSubtype = card.subtype
        ? TRANSLATIONS.subtype[card.subtype] || card.subtype
        : undefined;

    const translatedRace = card.race
        ? TRANSLATIONS.race[card.race] || card.race
        : null;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isDraggable || isPlayable === false || index === undefined) return;
        e.preventDefault();
        startDrag(
            card,
            index,
            e,
            'HAND',
            'portrait',
            undefined,
            isPlayableEvent,
            designationTargetIds
        );
        setHoveredCard(null);
    };

    const isCharacter = ['COMPANION', 'ALLY', 'MINION'].includes(card.type);
    const isFreepeopleCharacter = ['COMPANION', 'ALLY'].includes(card.type);

    const isRoaming =
        typeof currentSiteIndex === 'number' &&
        card.kind === 'SHADOW' &&
        card.type === 'MINION' &&
        typeof card.minionSiteNumber === 'number' &&
        card.minionSiteNumber > currentSiteIndex + 1;

    const effectiveVitality = getEffectiveVitality(card);
    const effectiveStrength = getEffectiveStrength(card, G);
    const effectiveResistance = getEffectiveResistance(card, burdens);

    // 🟢 État permanent : est-ce que la carte a des blessures ?
    const hasWounds = (card.wounds || 0) > 0;

    const isAttachment = requiresAttachmentTarget(card);

    const attachmentResistance = card.resistance ?? 0;
    const displayResistance = isAttachment
        ? attachmentResistance > 0
            ? `+${attachmentResistance}`
            : `${attachmentResistance}`
        : effectiveResistance;

    const shouldShowResistance =
        size === 'sm'
            ? isAttachment
                ? card.resistance !== undefined
                : true
            : isAttachment
              ? card.resistance !== undefined
              : !card.signet;

    const shouldShowSignet = Boolean(card.signet);

    const effectiveKeywords = getEffectiveKeywords(card);

    const rawActionable = isActionable ?? card?.isActionable ?? false;
    const effectiveIsActionable = rawActionable && !isOpponent;

    const isAttachedCard =
        requiresAttachmentTarget(card) || Boolean(card.attachedViaAid);
    const showAbilityButton =
        size === 'sm' &&
        !isOpponent &&
        !isAttachedCard &&
        cardOrAttachmentsHaveActionPhases(card);

    const abilityContext =
        G && playerID
            ? { G, ctx: { phase }, playerID }
            : null;
    const abilityPhaseMatch = Boolean(
        showAbilityButton &&
            abilityContext &&
            (canUseAbility(card, abilityContext).valid ||
                card.attachments?.some(
                    (att) => canUseAbility(att, abilityContext).valid
                ))
    );
    const listedAbilities = showAbilityButton
        ? collectCardAbilities(card).filter(
              ({ ability }) => !phase || abilityMatchesPhase(ability, phase)
          )
        : [];

    return (
        <S.CardContainer
            $culture={card.culture}
            $type={card.type}
            $subtype={card.subtype}
            $kind={card.kind}
            $isShadow={isShadow}
            $isPlayable={isPlayable}
            $size={size}
            $isActionable={effectiveIsActionable}
            $isRoaming={isRoaming}
            $isWounded={isWounded || hasWounds}
            $isTakingDamage={isTakingDamage}
            $isOverwhelmed={isOverwhelmed || card.isOverwhelmed}
            $isDead={isDead || card.isDead}
            $isOpponent={isOpponent}
            $isDisabled={isDisabled}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDragStart={isDraggable ? handleDragStart : undefined}
            onPointerDown={handlePointerDown}
            data-draggable={isDraggable ? 'true' : undefined}
            data-overwhelmed={card.isOverwhelmed ? 'true' : 'false'}
            $isAttachment={isAttachment}
        >
            {isCharacter && size === 'sm' && effectiveKeywords.length > 0 && (
                <S.KeywordsContainer>
                    {effectiveKeywords.map((kw) => (
                        <KeywordBadge
                            key={kw.raw}
                            keyword={kw.raw as CardKeyword}
                            size={18}
                        />
                    ))}
                </S.KeywordsContainer>
            )}

            {hasWounds && size === 'sm' && (
                <S.WoundsOverlay>
                    {Array.from({ length: card.wounds! }).map((_, i) => (
                        <S.WoundToken
                            key={i}
                            width="24px"
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
                        {title}
                    </S.CardTitle>
                    {subtitle && size !== 'sm' && (
                        <S.CardSubtitle $type={card.type}>
                            {subtitle}
                        </S.CardSubtitle>
                    )}
                </S.CardTitles>
            </S.CardHeader>

            {card.imageUrl && (
                <S.VisualContainer $type={card.type}>
                    <CardImage
                        key={card.id}
                        imageUrl={card.imageUrl}
                        alt={title ?? ''}
                    />
                </S.VisualContainer>
            )}

            {size !== 'sm' && (
                <S.CardTypes $type={card.type}>
                    {translatedType && (
                        <S.CardType $type={card.type}>
                            {translatedType}
                        </S.CardType>
                    )}
                    {translatedSubtype && card.subtype !== 'SUPPORT-AREA' && (
                        <S.CardType>
                            <S.Separator>•</S.Separator>
                            {translatedSubtype}
                        </S.CardType>
                    )}
                    {card.race && (
                        <S.CardType>
                            <S.Separator>•</S.Separator>
                            {translatedRace}
                        </S.CardType>
                    )}
                </S.CardTypes>
            )}

            <S.TextContainer>
                {size !== 'sm' && gameText && (
                    <S.GameText>
                        <FormattedText text={gameText} />
                    </S.GameText>
                )}
                {size === 'lg' && loreText && (
                    <S.LoreText>‟{loreText}”</S.LoreText>
                )}
            </S.TextContainer>

            {card.strength !== undefined && (
                <S.StrengthBadge>
                    {card.type === 'POSSESSION' ||
                    card.type === 'ARTIFACT' ||
                    card.type === 'CONDITION' ||
                    (card.type === 'RING' && card.subtype !== 'SUPPORT-AREA')
                        ? card.strength > 0
                            ? `+${card.strength}`
                            : `${card.strength}`
                        : size === 'sm'
                          ? effectiveStrength
                          : card.strength}
                </S.StrengthBadge>
            )}

            {card.vitality !== undefined && (
                <S.VitalityBadge>
                    {card.type === 'POSSESSION' ||
                    card.type === 'ARTIFACT' ||
                    card.type === 'CONDITION' ||
                    (card.type === 'RING' && card.subtype !== 'SUPPORT-AREA')
                        ? card.vitality > 0
                            ? `+${card.vitality}`
                            : `${card.vitality}`
                        : size === 'sm'
                          ? effectiveVitality
                          : card.vitality}
                </S.VitalityBadge>
            )}

            {card.minionSiteNumber !== undefined && (
                <S.RoamingNumber $isRoaming={isRoaming}>
                    {card.minionSiteNumber}

                    {isRoaming && size === 'md' && (
                        <S.RoamingBadge title="Pénalité d'errance (+2 Crépuscule)">
                            +2
                        </S.RoamingBadge>
                    )}
                </S.RoamingNumber>
            )}

            {isFreepeopleCharacter && shouldShowResistance && (
                <S.ResistanceWrapper>
                    <S.CardResistance $isRingBearer={Boolean(isRingBearer)}>
                        {displayResistance}
                    </S.CardResistance>

                    {/* 🟢 Affichage orbital des jetons de Fardeau sur le Porteur de l'Anneau */}
                    {isRingBearer && burdens > 0 && (
                        <S.BurdensOrbitalContainer>
                            {Array.from({ length: burdens }).map((_, i) => {
                                const angle = (360 / burdens) * i;
                                return (
                                    <S.OrbitalBurdenToken
                                        key={i}
                                        $angle={angle}
                                        $radius={22}
                                        $size={32}
                                        src="/interface/tokens/twilight_token.webp"
                                        alt="Fardeau"
                                        title={`${burdens} Fardeau(x)`}
                                    />
                                );
                            })}
                        </S.BurdensOrbitalContainer>
                    )}
                </S.ResistanceWrapper>
            )}

            {shouldShowSignet && card.signet && (
                <S.CardSignet $signet={card.signet} />
            )}

            {card.type && card.type === 'RING' && size === 'sm' && (
                <S.AttachmentSubtypeRing
                    src={`/interface/pictos/ONE-RING.webp`}
                    alt={card.type}
                    draggable={false}
                    width="16px"
                />
            )}

            {card.subtype &&
                card.subtype !== 'SUPPORT-AREA' &&
                size === 'sm' && (
                    <S.AttachmentSubtype
                        src={`/interface/pictos/${card.subtype}.webp`}
                        alt={card.subtype}
                        draggable={false}
                        width="16px"
                    />
                )}

            {card.type &&
                card.type === 'FOLLOWER' &&
                size === 'sm' && (
                    <S.AttachmentSubtype
                        src={`/interface/pictos/AID.webp`}
                        alt='Follower'
                        draggable={false}
                        width="16px"
                    />
                )}

            {showAbilityButton && (
                <S.AbilityButton
                    type="button"
                    $abilityPhaseMatch={abilityPhaseMatch}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAbilityMenuOpen((open) => !open);
                    }}
                >
                    A
                </S.AbilityButton>
            )}

            {showAbilityButton && isAbilityMenuOpen && (
                <S.AbilityBubble
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <S.AbilityBubbleClose
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsAbilityMenuOpen(false);
                        }}
                    >
                        ×
                    </S.AbilityBubbleClose>
                    <S.AbilityBubbleList>
                        {listedAbilities.map(({ source, ability }) => (
                            <li key={`${source.instanceId || source.id}:${ability.id}`}>
                                <S.AbilityBubbleItem
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onActivateAbility?.(
                                            source.instanceId || source.id,
                                            ability.id
                                        );
                                        setIsAbilityMenuOpen(false);
                                    }}
                                >
                                    {formatAbilityLabel(ability, source)}
                                </S.AbilityBubbleItem>
                            </li>
                        ))}
                    </S.AbilityBubbleList>
                </S.AbilityBubble>
            )}
        </S.CardContainer>
    );
};
