import React, { useEffect, useRef, useState } from 'react';
import type {
    CardState,
    GameState,
    SiteCardState,
    PlayerState,
} from '../../../../game/types';
import { getRegionTwilightBonus } from '../../../../game/logic/sites';
import { getCardById } from '../../../../game/cardsData';
import {
    attachesToSite,
    canPlayCard,
} from '../../../../game/engine/canPlayCard';
import { SiteCard } from '../SiteCard';
import { Card } from '../Card';
import { SiteAttachmentAbilitySeal } from './SiteAttachmentAbilitySeal';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { audioService } from '../../../../services/audioService';

export const SITE_UX_MOCK_EVENT = 'lotr-site-ux-mock';
export const SITE_UX_MOCK_KEY = 'lotr_site_ux_mock';

const MOCK_STACK_IDS = ['4C180', '7C275', '4U11'] as const;

function mockStackedCards(count: number): CardState[] {
    return Array.from({ length: count }, (_, i) => {
        const id = MOCK_STACK_IDS[i % MOCK_STACK_IDS.length];
        const base = getCardById(id);
        if (!base) {
            return {
                id,
                instanceId: `mock-stack-${i}`,
                kind: 'SHADOW',
                type: 'MINION',
                culture: 'SAURON',
                twilightCost: 3,
                strength: 8,
                vitality: 2,
            } as CardState;
        }
        return {
            ...base,
            instanceId: `mock-stack-${id}-${i}`,
        };
    });
}

/** Contrôle / stack factices — attache réelle via site.attachments. */
const UX_MOCK_BY_INDEX: Record<
    number,
    {
        controlledBy?: '0' | '1';
        stackCount?: number;
    }
> = {
    1: { controlledBy: '1' },
    3: { controlledBy: '0', stackCount: 3 },
    4: { controlledBy: '1', stackCount: 2 },
};

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
    const [uxMock, setUxMock] = useState(
        () =>
            import.meta.env.DEV &&
            sessionStorage.getItem(SITE_UX_MOCK_KEY) === '1'
    );

    useEffect(() => {
        const sync = () =>
            setUxMock(
                import.meta.env.DEV &&
                    sessionStorage.getItem(SITE_UX_MOCK_KEY) === '1'
            );
        window.addEventListener(SITE_UX_MOCK_EVENT, sync);
        return () => window.removeEventListener(SITE_UX_MOCK_EVENT, sync);
    }, []);

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

    const p0 = players?.['0'];
    const p1 = players?.['1'];

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
                isSiteAttachPick &&
                siteKey != null &&
                isCardTargetable(siteKey as string)) ||
            isDragDesignationCandidate ||
            canAcceptSiteAttach;

        const pathReplaceDimmed =
            (isPathReplacePick ||
                isSiteAttachPick ||
                isDragDesignating ||
                isSiteAttachDrag) &&
            Boolean(site) &&
            !pathReplaceTargetable;

        const isAimed =
            Boolean(siteKey) &&
            (activeTargetId === siteKey || activeTargetId === site?.id);

        const mock = uxMock && site ? UX_MOCK_BY_INDEX[index] : undefined;
        const attachments = site?.attachments || [];

        const shouldRegisterSiteTarget =
            Boolean(siteKey) &&
            (isDragDesignationCandidate ||
                canAcceptSiteAttach ||
                (isSiteAttachPick &&
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
                        isSiteAttachPick) &&
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
                        (!isPathReplacePick && !isSiteAttachPick) ||
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
                    const controlledBy =
                        site?.controlledBy ??
                        (uxMock ? mock?.controlledBy : undefined);
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
                {uxMock &&
                    mock?.controlledBy != null &&
                    mock.stackCount != null &&
                    mock.stackCount > 0 && (
                        <S.StackedMinionsGrid>
                            {mockStackedCards(mock.stackCount).map((card) => (
                                <S.StackedMinionSlot
                                    key={card.instanceId || card.id}
                                    onMouseEnter={() =>
                                        setHoveredCard(card, 'portrait')
                                    }
                                    onMouseLeave={() => {
                                        if (site) {
                                            setHoveredCard(site, 'landscape');
                                        } else {
                                            setHoveredCard(null);
                                        }
                                    }}
                                >
                                    <Card
                                        card={card}
                                        size="sm"
                                        isDraggable={false}
                                    />
                                </S.StackedMinionSlot>
                            ))}
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
