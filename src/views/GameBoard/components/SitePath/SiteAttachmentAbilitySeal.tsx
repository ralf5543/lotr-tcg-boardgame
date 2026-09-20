import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
    Ability,
    CardState,
    GameState,
    SiteCardState,
} from '../../../../game/types';
import { canUseAbility } from '../../../../game/engine/canUseAbility';
import { canPayAbilityCost } from '../../../../game/engine/abilities/payAbilityCost';
import { abilityMeetsPlayRestrictions } from '../../../../game/engine/abilities/abilityRestrictions';
import { abilityHasLegalEffectTarget } from '../../../../game/engine/abilities/designation';
import {
    abilityMatchesPhase,
    collectVisibleAbilities,
    formatAbilityLabelParts,
} from '../../../../game/engine/abilities/collectAbilities';
import {
    abilityMatchesTrigger,
    responseAbilityStillAvailable,
} from '../../../../game/engine/responseWindow';
import { FormattedText } from '../../../../utils/FormattedText';
import { getCardText } from '../../../../utils/i18n';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import * as CardS from '../Card/styles';
import * as S from './styles';

function cultureIconPath(culture: string) {
    return `interface/icons/icon_culture_${culture}.webp`;
}

function isWeatherAttachment(card: CardState): boolean {
    return (card.keywords || []).some(
        (kw) => String(kw).toUpperCase() === 'WEATHER'
    );
}

function viewerOwnsAttachment(
    card: CardState,
    localPlayerId: string | undefined,
    fpPlayerId: string
): boolean {
    if (!localPlayerId) return false;
    if (card.kind === 'FREE_PEOPLE') return localPlayerId === fpPlayerId;
    if (card.kind === 'SHADOW') return localPlayerId !== fpPlayerId;
    return false;
}

interface SiteAttachmentAbilitySealProps {
    card: CardState;
    siteForHover: SiteCardState | CardState | null;
    G?: GameState;
    phase?: string;
    localPlayerId?: string;
    onActivateAbility?: (
        sourceInstanceId: string,
        abilityId: string,
        chosenTargetId?: string,
        discardedHandIds?: string[],
        chosenEffectTargetId?: string | string[]
    ) => void;
}

/**
 * Badge d’attache site = bouton d’abilité (halo or + bulle de confirmation),
 * même UX que le bouton culture des cartes en jeu.
 */
export const SiteAttachmentAbilitySeal: React.FC<
    SiteAttachmentAbilitySealProps
> = ({
    card,
    siteForHover,
    G,
    phase,
    localPlayerId,
    onActivateAbility,
}) => {
    const { setHoveredCard } = useHoverCard();
    const [isAbilityMenuOpen, setIsAbilityMenuOpen] = useState(false);
    const [abilityBubbleCoords, setAbilityBubbleCoords] = useState({
        top: 0,
        left: 0,
    });
    const sealRef = useRef<HTMLButtonElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);

    const weather = isWeatherAttachment(card);
    const { title } = getCardText(card, 'fr');
    const label = title || card.id;
    const fpId = G?.fpPlayerId || '0';
    const owns = viewerOwnsAttachment(card, localPlayerId, fpId);

    const visibleAbilities = G
        ? collectVisibleAbilities(G, card)
        : (card.abilities || []).map((ability) => ({
              source: card,
              ability,
          }));

    const abilityContext =
        G && localPlayerId
            ? { G, ctx: { phase }, playerID: localPlayerId }
            : null;

    const listedAbilities = visibleAbilities.filter(({ source, ability }) => {
        if (!G) return false;
        if (G.responseWindow?.isOpen) {
            if (!abilityMatchesPhase(ability, 'RESPONSE')) return false;
            if (!abilityMatchesTrigger(ability, G.pendingEvent, source, G)) {
                return false;
            }
            if (!responseAbilityStillAvailable(G, source, ability)) return false;
            return (
                canPayAbilityCost(G, source, ability.cost) &&
                abilityHasLegalEffectTarget(G, source, ability)
            );
        }
        if (abilityMatchesPhase(ability, 'RESPONSE')) return false;
        if (!phase || !abilityMatchesPhase(ability, phase)) return false;
        return (
            abilityMeetsPlayRestrictions(G, source, ability) &&
            canPayAbilityCost(G, source, ability.cost) &&
            abilityHasLegalEffectTarget(G, source, ability)
        );
    });

    const hasAbilityUi = owns && visibleAbilities.length > 0;
    const abilityPhaseMatch = Boolean(
        hasAbilityUi &&
            abilityContext &&
            listedAbilities.length > 0 &&
            (G?.responseWindow?.isOpen
                ? String(G.responseWindow.activePlayerId) ===
                  String(localPlayerId)
                : canUseAbility(card, abilityContext).valid)
    );

    if (isAbilityMenuOpen && !abilityPhaseMatch) {
        setIsAbilityMenuOpen(false);
    }

    useLayoutEffect(() => {
        if (!isAbilityMenuOpen || !abilityPhaseMatch) return;
        const updateCoords = () => {
            const rect = sealRef.current?.getBoundingClientRect();
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
            if (sealRef.current?.contains(target)) return;
            if (bubbleRef.current?.contains(target)) return;
            setIsAbilityMenuOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () =>
            document.removeEventListener('pointerdown', handlePointerDown);
    }, [isAbilityMenuOpen, abilityPhaseMatch]);

    const activateListedAbility = (source: CardState, ability: Ability) => {
        const sourceId = source.instanceId || source.id;
        onActivateAbility?.(sourceId, ability.id);
    };

    return (
        <>
            <S.SiteAttachmentSeal
                ref={sealRef}
                type="button"
                $isWeather={weather}
                $abilityPhaseMatch={abilityPhaseMatch}
                title={label}
                aria-disabled={!abilityPhaseMatch}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!abilityPhaseMatch) return;
                    setIsAbilityMenuOpen((open) => !open);
                }}
                onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredCard(card, 'portrait');
                }}
                onMouseLeave={(e) => {
                    e.stopPropagation();
                    if (siteForHover) {
                        setHoveredCard(siteForHover, 'landscape');
                    } else {
                        setHoveredCard(null);
                    }
                }}
            >
                {card.culture && (
                    <img
                        src={cultureIconPath(card.culture)}
                        alt=""
                        draggable={false}
                    />
                )}
                <S.AttachmentTitle>{label}</S.AttachmentTitle>
                {weather && (
                    <S.WeatherEmoji aria-hidden>🌧</S.WeatherEmoji>
                )}
            </S.SiteAttachmentSeal>

            {hasAbilityUi &&
                isAbilityMenuOpen &&
                abilityPhaseMatch &&
                createPortal(
                    <CardS.AbilityBubble
                        ref={bubbleRef}
                        $top={abilityBubbleCoords.top}
                        $left={abilityBubbleCoords.left}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <CardS.AbilityBubbleClose
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsAbilityMenuOpen(false);
                            }}
                        >
                            ×
                        </CardS.AbilityBubbleClose>
                        <CardS.AbilityBubbleList>
                            {listedAbilities.map(({ source, ability }) => {
                                const { cost, effect } =
                                    formatAbilityLabelParts(ability, source);
                                return (
                                    <li
                                        key={`${source.instanceId || source.id}:${ability.id}`}
                                    >
                                        <CardS.AbilityBubbleItem
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
                                                <span className="ability-bubble-cost">
                                                    <FormattedText
                                                        text={cost}
                                                    />
                                                </span>
                                            ) : null}
                                            {effect ? (
                                                <>
                                                    {cost ? ' : ' : null}
                                                    <FormattedText
                                                        text={effect}
                                                    />
                                                </>
                                            ) : null}
                                        </CardS.AbilityBubbleItem>
                                    </li>
                                );
                            })}
                        </CardS.AbilityBubbleList>
                    </CardS.AbilityBubble>,
                    document.body
                )}
        </>
    );
};
