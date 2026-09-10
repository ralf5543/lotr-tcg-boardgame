import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Ability, CardState, CardKeyword, GameState } from '../../../../game/types';
import * as S from './styles';
import { TRANSLATIONS } from '../../../../game/translations';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import type { CardSignet } from '../../../../game/types';
import { FormattedText } from '../../../../utils/FormattedText';
import { KeywordBadge } from '../KeywordBadge';
import { useDrag } from '../../../../contexts/DragContext';
import {
    useFaction,
    useLocalFaction,
} from '../../../../contexts/FactionContext';
import { isWoundRecoilDown } from './woundRecoil';
import {
    getEffectiveVitality,
    getEffectiveStrength,
    getEffectiveResistance,
} from '../../../../utils/cardStats';
import { getCardText } from '../../../../utils/i18n';
import { isRingBearerCard } from '../../../../utils/cardUtils';
import type { SupportedLanguage } from '../../../../utils/i18n';
import { requiresAttachmentTarget } from '../../../../game/engine/canPlayCard';
import { getEffectiveKeywords } from '../../../../game/engine/keywords/keywordUtils';
import { canUseAbility } from '../../../../game/engine/canUseAbility';
import { canPayAbilityCost } from '../../../../game/engine/abilities/payAbilityCost';
import { abilityNeedsDesignation } from '../../../../game/engine/abilities/designation';
import {
    cardOrAttachmentsHaveActionPhases,
    collectVisibleAbilities,
    formatAbilityLabelParts,
    abilityMatchesPhase,
} from '../../../../game/engine/abilities/collectAbilities';
import { abilityMatchesTrigger } from '../../../../game/engine/responseWindow';

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

function sanitizeFilterId(raw: string): string {
    return `wraith-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

const WraithWorldOverlay: React.FC<{
    imageUrl?: string;
    alt: string;
    filterId: string;
    size: 'sm' | 'md' | 'lg';
}> = ({ imageUrl, alt, filterId, size }) => {
    const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
    const displaceRef = useRef<SVGFEDisplacementMapElement>(null);

    useEffect(() => {
        const turbulence = turbulenceRef.current;
        const displace = displaceRef.current;
        if (!turbulence || !displace) return;

        const baseScale = size === 'lg' ? 18 : size === 'md' ? 12 : 9;
        let frame = 0;
        const tick = (now: number) => {
            const t = now / 2000;
            const fx =
                0.013 + Math.sin(t * 0.33) * 0.006 + Math.sin(t * 0.91) * 0.0025;
            const fy =
                0.032 + Math.cos(t * 0.27) * 0.012 + Math.sin(t * 0.6) * 0.004;
            turbulence.setAttribute(
                'baseFrequency',
                `${fx.toFixed(4)} ${fy.toFixed(4)}`
            );
            const scale =
                baseScale +
                Math.sin(t * 0.52) * (baseScale * 0.45) +
                Math.sin(t * 1.25) * (baseScale * 0.18);
            displace.setAttribute('scale', scale.toFixed(2));
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [size]);

    return (
        <>
            <S.WraithWorldFilterSvg aria-hidden>
                <filter
                    id={filterId}
                    x="-25%"
                    y="-25%"
                    width="150%"
                    height="150%"
                    colorInterpolationFilters="sRGB"
                >
                    <feTurbulence
                        ref={turbulenceRef}
                        type="fractalNoise"
                        baseFrequency="0.018 0.04"
                        numOctaves="3"
                        seed="3"
                        result="noise"
                    />
                    <feDisplacementMap
                        ref={displaceRef}
                        in="SourceGraphic"
                        in2="noise"
                        scale="10"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </S.WraithWorldFilterSvg>
            <S.WraithWorldLayer $filterId={filterId}>
                <S.WraithWorldVisual>
                    <CardImage imageUrl={imageUrl} alt={alt} />
                </S.WraithWorldVisual>
                <S.WraithWorldVeil />
            </S.WraithWorldLayer>
        </>
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
    onActivateAbility?: (
        sourceInstanceId: string,
        abilityId: string,
        chosenTargetId?: string
    ) => void;
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
    const { myPlayerId } = useFaction();
    const localFaction = useLocalFaction();
    const recoilDown = isWoundRecoilDown(card?.kind, localFaction, isOpponent);

    const [isTakingDamage, setIsTakingDamage] = useState(false);
    const [isExerting, setIsExerting] = useState(false);
    const [exertGen, setExertGen] = useState(0);
    const [isAbilityMenuOpen, setIsAbilityMenuOpen] = useState(false);
    const [abilityBubbleCoords, setAbilityBubbleCoords] = useState({
        top: 0,
        left: 0,
    });
    const abilityButtonRef = useRef<HTMLButtonElement>(null);
    const abilityBubbleRef = useRef<HTMLDivElement>(null);
    const prevWoundsRef = useRef(card?.wounds || 0);
    const lastExertedIdsRef = useRef(G?.lastExertedCardIds);
    lastExertedIdsRef.current = G?.lastExertedCardIds;

    const isAttachedCard = Boolean(
        card &&
            (requiresAttachmentTarget(card) ||
                card.attachedViaAid ||
                card.type === 'RING')
    );
    const viewerPlayerId = myPlayerId || playerID;
    const viewerOwnsCard = Boolean(card && card.kind === localFaction);
    const visibleAbilities =
        card && size === 'sm' && !isAttachedCard
            ? collectVisibleAbilities(G, card)
            : [];
    const showAbilityButton = Boolean(
        card &&
            size === 'sm' &&
            viewerOwnsCard &&
            !isAttachedCard &&
            (visibleAbilities.length > 0 ||
                (!G && cardOrAttachmentsHaveActionPhases(card)))
    );
    const abilityContext =
        G && viewerPlayerId
            ? { G, ctx: { phase }, playerID: viewerPlayerId }
            : null;
    const listedAbilities = showAbilityButton
        ? visibleAbilities.filter(({ source, ability }) => {
              if (G?.responseWindow?.isOpen) {
                  if (!abilityMatchesPhase(ability, 'RESPONSE')) return false;
                  if (
                      !abilityMatchesTrigger(
                          ability,
                          G.pendingEvent,
                          source,
                          G
                      )
                  ) {
                      return false;
                  }
                  return canPayAbilityCost(G, source, ability.cost);
              }
              const responseAbility = abilityMatchesPhase(ability, 'RESPONSE');
              const responseUsable = Boolean(
                  abilityContext &&
                      responseAbility &&
                      canUseAbility(source, abilityContext).valid
              );
              if (responseUsable) return responseAbility;
              return !phase || abilityMatchesPhase(ability, phase);
          })
        : [];
    const abilityPhaseMatch = Boolean(
        card &&
            showAbilityButton &&
            abilityContext &&
            listedAbilities.length > 0 &&
            (G?.responseWindow?.isOpen
                ? G.responseWindow.activePlayerId === viewerPlayerId
                : canUseAbility(card, abilityContext).valid)
    );

    if (isAbilityMenuOpen && !abilityPhaseMatch) {
        setIsAbilityMenuOpen(false);
    }

    useLayoutEffect(() => {
        if (!isAbilityMenuOpen || !abilityPhaseMatch) return;

        const updateCoords = () => {
            const rect = abilityButtonRef.current?.getBoundingClientRect();
            if (!rect) return;
            setAbilityBubbleCoords({
                top: rect.top - 4,
                left: rect.left + rect.width / 2,
            });
        };

        updateCoords();
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords, true);
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isAbilityMenuOpen, abilityPhaseMatch]);

    useEffect(() => {
        if (!isAbilityMenuOpen || !abilityPhaseMatch) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (abilityButtonRef.current?.contains(target)) return;
            if (abilityBubbleRef.current?.contains(target)) return;
            setIsAbilityMenuOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [isAbilityMenuOpen, abilityPhaseMatch]);

    useEffect(() => {
        if (!card) return;
        const currentWounds = card.wounds || 0;

        if (currentWounds > prevWoundsRef.current) {
            const cardId = card.instanceId || card.id;
            const exertedIds = lastExertedIdsRef.current;
            const fromExert = Boolean(
                exertedIds?.includes(cardId) || exertedIds?.includes(card.id)
            );

            if (fromExert) {
                setExertGen((n) => n + 1);
                setIsExerting(true);
                const timer = setTimeout(() => {
                    setIsExerting(false);
                }, 500);
                prevWoundsRef.current = currentWounds;
                return () => clearTimeout(timer);
            }

            setIsTakingDamage(true);
            const timer = setTimeout(() => {
                setIsTakingDamage(false);
            }, 650);

            prevWoundsRef.current = currentWounds;
            return () => clearTimeout(timer);
        }

        prevWoundsRef.current = currentWounds;
    }, [card?.wounds, card?.instanceId, card?.id]);

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

    const isRingBearer = isRingBearerProp ?? isRingBearerCard(card);

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
    const effectiveIsActionable =
        rawActionable && !isOpponent && !showAbilityButton;

    const activateListedAbility = (
        source: CardState,
        ability: Ability
    ) => {
        const hostId = card.instanceId || card.id;
        const sourceId = source.instanceId || source.id;
        const passHost = Boolean(
            G &&
                sourceId !== hostId &&
                abilityNeedsDesignation(G, source, ability)
        );
        onActivateAbility?.(
            sourceId,
            ability.id,
            passHost ? hostId : undefined
        );
    };

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
            $isExerting={isExerting}
            $exertGen={exertGen}
            $isOverwhelmed={isOverwhelmed || card.isOverwhelmed}
            $isDead={isDead || card.isDead}
            $isOpponent={isOpponent}
            $recoilDown={recoilDown}
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
                            value={kw.value}
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
                    {Boolean(
                        G?.wearingTheOneRing &&
                            isRingBearer &&
                            size !== 'lg' &&
                            !isDead &&
                            !isFaceDown
                    ) && (
                        <WraithWorldOverlay
                            imageUrl={card.imageUrl}
                            alt=""
                            filterId={sanitizeFilterId(
                                `${card.instanceId || card.id}-${size}`
                            )}
                            size={size}
                        />
                    )}
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
                    ref={abilityButtonRef}
                    type="button"
                    $abilityPhaseMatch={abilityPhaseMatch}
                    $culture={card.culture}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!abilityPhaseMatch) return;
                        setIsAbilityMenuOpen((open) => !open);
                    }}
                >
                    <img src={`/interface/icons/icon_culture_${card.culture}.webp`} alt={card.culture} draggable={false} width="17px" />
                </S.AbilityButton>
            )}

            {showAbilityButton &&
                isAbilityMenuOpen &&
                abilityPhaseMatch &&
                createPortal(
                    <S.AbilityBubble
                        ref={abilityBubbleRef}
                        $top={abilityBubbleCoords.top}
                        $left={abilityBubbleCoords.left}
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
                            {listedAbilities.map(({ source, ability }) => {
                                const { cost, effect } =
                                    formatAbilityLabelParts(ability, source);
                                return (
                                <li
                                    key={`${source.instanceId || source.id}:${ability.id}`}
                                >
                                    <S.AbilityBubbleItem
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            activateListedAbility(
                                                source,
                                                ability
                                            );
                                            setIsAbilityMenuOpen(false);
                                        }}
                                    >
                                        {cost ? (
                                            <span>
                                                <FormattedText text={cost} />
                                            </span>
                                        ) : null}
                                        {effect
                                            ? cost
                                                ? ` : ${effect}`
                                                : effect
                                            : null}
                                    </S.AbilityBubbleItem>
                                </li>
                                );
                            })}
                        </S.AbilityBubbleList>
                    </S.AbilityBubble>,
                    document.body
                )}
        </S.CardContainer>
    );
};
