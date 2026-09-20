import React, { useEffect, useRef } from 'react';
import type {
    CardState,
    GameState,
    SiteCardState,
    PlayerState,
} from '../../../../game/types';
import { getRegionTwilightBonus } from '../../../../game/logic/sites';
import {
    attachesToSite,
    canPlayCard,
} from '../../../../game/engine/canPlayCard';
import { canUseAbility } from '../../../../game/engine/canUseAbility';
import { SiteCard } from '../SiteCard';
import { Card } from '../Card';
import { SiteAttachmentAbilitySeal } from './SiteAttachmentAbilitySeal';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { audioService } from '../../../../services/audioService';
import { useLocalFaction } from '../../../../contexts/FactionContext';

interface SitePathProps {
    path: (SiteCardState | null)[];
    players?: Record<string, PlayerState>;
    localPlayerId?: string;
    G?: GameState;
    phase?: string;
    onPlaySite?: (siteId: string, targetIndex: number) => void;
    onActivateAbility?: (
        sourceInstanceId: string,
        abilityId: string,
        chosenTargetId?: string,
        discardedHandIds?: string[],
        chosenEffectTargetId?: string | string[]
    ) => void;
}

const REGION_INDEXES: Record<1 | 2 | 3, number[]> = {
    1: [0, 1, 2],
    2: [3, 4, 5],
    3: [6, 7, 8],
};

export const SitePath: React.FC<SitePathProps> = ({
    path = [],
    players = {},
    localPlayerId,
    G,
    phase,
    onPlaySite,
    onActivateAbility,
}) => {
    const {
        registerTarget,
        activeTargetId,
        dragged,
        isOverHandCancel,
        startDrag,
    } = useDrag();
    const {
        targetingKind,
        isCardTargetable,
        selectCard,
        isTargetingActive,
    } = useTargeting();
    const isPathReplacePick =
        targetingKind === 'SITE_REPLACE_PATH' && isTargetingActive;
    const isSiteAttachPick =
        targetingKind === 'SITE_ATTACH' && isTargetingActive;
    const isSiteStackPick =
        targetingKind === 'SITE_STACK' && isTargetingActive;
    const isSitePathPick = isSiteAttachPick || isSiteStackPick;
    const dragDesignationIds = dragged?.designationTargetIds;
    const isDragDesignating =
        Boolean(dragDesignationIds?.length) && !isOverHandCancel;
    const slots = Array.from({ length: 9 }, (_, i) => path?.[i] ?? null);
    const nextEmptyIndex = slots.findIndex((slot) => slot === null);

    const draggedCard = dragged?.card as CardState | undefined;
    /** Drop direct sur site (Strong Arms) — pas le 1er pas exert (Neiges). */
    const isSiteAttachDrag =
        dragged?.origin === 'HAND' &&
        Boolean(draggedCard) &&
        attachesToSite(draggedCard) &&
        !dragged?.designationTargetIds?.length &&
        !isOverHandCancel;

    const nextSlotRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (nextSlotRef.current) {
            registerTarget('sitePath', nextSlotRef.current);
        } else {
            registerTarget('sitePath', null);
        }
        return () => registerTarget('sitePath', null);
    }, [nextEmptyIndex, registerTarget]);

    useEffect(() => {
        const handleCardDropped = (e: CustomEvent) => {
            const { draggedCard: dropped, targetId } = e.detail;

            if (targetId === 'sitePath') {
                const siteId = dropped?.card?.id;

                if (siteId && onPlaySite) {
                    onPlaySite(siteId, nextEmptyIndex);
                    audioService.play('CARD_PLAY');
                    audioService.play('SITE', { delay: 0.3 });
                } else {
                    console.warn(
                        '⚠️ [SITEPATH] Missing siteId or onPlaySite prop!',
                        { siteId, onPlaySite }
                    );
                }
            }
        };

        window.addEventListener(
            'card-dropped',
            handleCardDropped as EventListener
        );
        return () => {
            window.removeEventListener(
                'card-dropped',
                handleCardDropped as EventListener
            );
        };
    }, [nextEmptyIndex, onPlaySite]);

    const { setHoveredCard } = useHoverCard();
    const localFaction = useLocalFaction();

    const p0 = players?.['0'];
    const p1 = players?.['1'];

    const isStackedPlayable = (card: CardState): boolean => {
        if (!G || !phase || !localPlayerId) return false;
        if (card.kind !== localFaction) return false;
        return canUseAbility(card, {
            G,
            ctx: { phase },
            playerID: localPlayerId,
        }).valid;
    };

    const renderSlot = (index: number) => {
        const site = slots[index];
        const isNextEmpty = index === nextEmptyIndex;
        const isHovered =
            isNextEmpty &&
            activeTargetId === 'sitePath' &&
            dragged?.orientation === 'landscape';

        const isP0Here = p0?.currentSiteIndex === index;
        const isP1Here = p1?.currentSiteIndex === index;
        const regionBonus = getRegionTwilightBonus(index + 1);

        const playersHere = {
            p0: isP0Here
                ? {
                      avatarUrl: p0?.profile?.avatar,
                      name: p0?.profile?.name,
                  }
                : false,
            p1: isP1Here
                ? {
                      avatarUrl: p1?.profile?.avatar,
                      name: p1?.profile?.name,
                  }
                : false,
        };

        const siteKey = site
            ? (site as SiteCardState & { instanceId?: string }).instanceId ||
              site.id
            : undefined;

        const isDragDesignationCandidate = Boolean(
            siteKey &&
                isDragDesignating &&
                (dragDesignationIds!.includes(siteKey) ||
                    (site?.id && dragDesignationIds!.includes(site.id)))
        );

        const canAcceptSiteAttach =
            Boolean(site && siteKey && isSiteAttachDrag && G && localPlayerId) &&
            canPlayCard(
                draggedCard!,
                {
                    G: G!,
                    ctx: { phase: undefined, currentPlayer: localPlayerId! },
                    playerID: localPlayerId!,
                },
                siteKey,
                site,
                { ignorePhase: true }
            ).valid;

        const pathReplaceTargetable =
            (Boolean(siteKey) &&
                isPathReplacePick &&
                siteKey != null &&
                isCardTargetable(siteKey as string)) ||
            (Boolean(siteKey) &&
                isSitePathPick &&
                siteKey != null &&
                isCardTargetable(siteKey as string)) ||
            isDragDesignationCandidate ||
            canAcceptSiteAttach;

        const pathReplaceDimmed =
            (isPathReplacePick ||
                isSitePathPick ||
                isDragDesignating ||
                isSiteAttachDrag) &&
            Boolean(site) &&
            !pathReplaceTargetable;

        const isAimed =
            Boolean(siteKey) &&
            (activeTargetId === siteKey || activeTargetId === site?.id);

        const attachments = site?.attachments || [];

        const shouldRegisterSiteTarget =
            Boolean(siteKey) &&
            (isDragDesignationCandidate ||
                canAcceptSiteAttach ||
                (isSitePathPick &&
                    siteKey != null &&
                    isCardTargetable(siteKey as string)));

        return (
            <S.SiteCardContainer
                key={index}
                ref={(el) => {
                    if (isNextEmpty) {
                        nextSlotRef.current = el;
                    }
                    if (!siteKey) return;
                    if (shouldRegisterSiteTarget && el) {
                        registerTarget(siteKey, el);
                        if (site?.id && site.id !== siteKey) {
                            registerTarget(site.id, el);
                        }
                    } else {
                        registerTarget(siteKey, null);
                        if (site?.id && site.id !== siteKey) {
                            registerTarget(site.id, null);
                        }
                    }
                }}
                $isCurrent={isP0Here || isP1Here}
                $index={index}
                $isHovered={
                    isHovered ||
                    ((isDragDesignationCandidate ||
                        canAcceptSiteAttach ||
                        isSitePathPick) &&
                        isAimed)
                }
                $hasSite={Boolean(site)}
                $isMine={
                    site && localPlayerId !== undefined
                        ? site.ownerId === localPlayerId
                        : undefined
                }
                $pathReplaceTargetable={pathReplaceTargetable}
                $pathReplaceDimmed={pathReplaceDimmed}
                onMouseEnter={() => {
                    if (site) {
                        setHoveredCard(site, 'landscape');
                    }
                }}
                onMouseLeave={() => setHoveredCard(null)}
                onPointerDown={(e) => {
                    if (!pathReplaceTargetable || !siteKey) return;
                    if (
                        (!isPathReplacePick && !isSitePathPick) ||
                        isDragDesignating
                    ) {
                        return;
                    }
                    e.stopPropagation();
                    e.preventDefault();
                    setHoveredCard(null);
                    selectCard(siteKey);
                }}
            >
                {site ? (
                    <SiteCard
                        site={site}
                        size="sm"
                        playersHere={playersHere}
                    />
                ) : (
                    <S.EmptySlotContent $isNextEmpty={isNextEmpty}>
                        <S.SlotTitle>Site {index + 1}</S.SlotTitle>
                        <S.SlotStatus
                            $isNextEmpty={isNextEmpty}
                            $isHovered={isHovered}
                        >
                            {isNextEmpty
                                ? isHovered
                                    ? '✨ Lâcher ici !'
                                    : '🎯 Poser ici'
                                : 'Inexploré'}
                        </S.SlotStatus>
                        {regionBonus > 0 && (
                            <S.RegionBonus>+{regionBonus} 🌙</S.RegionBonus>
                        )}
                    </S.EmptySlotContent>
                )}

                {(() => {
                    const controlledBy = site?.controlledBy;
                    if (controlledBy == null) return null;
                    const playerId =
                        controlledBy === '0' || controlledBy === '1'
                            ? controlledBy
                            : '0';
                    return (
                        <S.ControlFlag
                            $playerId={playerId}
                            title={`Contrôle P${Number(playerId) + 1}`}
                        >
                            <S.ControlFlagLabel $playerId={playerId}>
                                P{Number(playerId) + 1}
                            </S.ControlFlagLabel>
                        </S.ControlFlag>
                    );
                })()}

                {attachments.length > 0 && (
                    <S.AttachmentSeals>
                        {attachments.map((att) => (
                            <SiteAttachmentAbilitySeal
                                key={att.instanceId || att.id}
                                card={att}
                                siteForHover={site}
                                G={G}
                                phase={phase}
                                localPlayerId={localPlayerId}
                                onActivateAbility={onActivateAbility}
                            />
                        ))}
                    </S.AttachmentSeals>
                )}
                {(site?.stacked?.length || 0) > 0 && (
                    <S.StackedMinionsGrid>
                        {(site!.stacked || []).map((card, stackIndex) => {
                            const playable = isStackedPlayable(card);
                            const cardKey = card.instanceId || card.id;
                            const draggedStacked =
                                dragged?.origin === 'SITE_STACK' &&
                                dragged.card &&
                                'type' in dragged.card
                                    ? (dragged.card as CardState)
                                    : null;
                            const isBeingDragged = Boolean(
                                draggedStacked &&
                                    (draggedStacked.instanceId === cardKey ||
                                        draggedStacked.id === cardKey)
                            );
                            return (
                                <S.StackedMinionSlot
                                    key={cardKey}
                                    $playable={playable}
                                    $dragging={Boolean(isBeingDragged)}
                                    data-draggable={
                                        playable ? 'true' : undefined
                                    }
                                    data-cursor={
                                        playable ? 'hand' : undefined
                                    }
                                    onMouseEnter={() => {
                                        if (isBeingDragged) return;
                                        setHoveredCard(card, 'portrait');
                                    }}
                                    onMouseLeave={() => {
                                        if (site) {
                                            setHoveredCard(site, 'landscape');
                                        } else {
                                            setHoveredCard(null);
                                        }
                                    }}
                                    onPointerDown={(e) => {
                                        if (!playable || e.button !== 0) {
                                            return;
                                        }
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setHoveredCard(null);
                                        startDrag(
                                            card,
                                            stackIndex,
                                            e,
                                            'SITE_STACK',
                                            'portrait',
                                            siteKey
                                        );
                                    }}
                                >
                                    <Card
                                        card={card}
                                        size="sm"
                                        isDraggable={false}
                                        isStackedOnSite
                                        G={G}
                                        phase={phase}
                                        playerID={localPlayerId}
                                        onActivateAbility={onActivateAbility}
                                    />
                                </S.StackedMinionSlot>
                            );
                        })}
                    </S.StackedMinionsGrid>
                )}
            </S.SiteCardContainer>
        );
    };

    return (
        <S.SitespathContainer>
            {([1, 2, 3] as const).map((region) => (
                <S.RegionGroup
                    key={region}
                    $region={region}
                    data-region={region}
                    data-region-label={`Région ${region}`}
                >
                    {REGION_INDEXES[region].map(renderSlot)}
                </S.RegionGroup>
            ))}
        </S.SitespathContainer>
    );
};
