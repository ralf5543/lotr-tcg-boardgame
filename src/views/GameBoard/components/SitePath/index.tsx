import React, { useEffect, useRef } from 'react';
import type { SiteCardState, PlayerState } from '../../../../game/types';
import {
    getRegionTwilightBonus,
} from '../../../../game/logic/sites';
import { SiteCard } from '../SiteCard';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import { audioService } from '../../../../services/audioService';

interface SitePathProps {
    path: (SiteCardState | null)[];
    players?: Record<string, PlayerState>;
    onPlaySite?: (siteId: string, targetIndex: number) => void;
}

const REGION_INDEXES: Record<1 | 2 | 3, number[]> = {
    1: [0, 1, 2],
    2: [3, 4, 5],
    3: [6, 7, 8],
};

export const SitePath: React.FC<SitePathProps> = ({
    path = [],
    players = {},
    onPlaySite,
}) => {
    const { registerTarget, activeTargetId, dragged } = useDrag();
    const slots = Array.from({ length: 9 }, (_, i) => path?.[i] ?? null);
    const nextEmptyIndex = slots.findIndex((slot) => slot === null);

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
            const { draggedCard, targetId } = e.detail;

            if (targetId === 'sitePath') {
                const siteId = draggedCard?.card?.id;

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

        return (
            <S.SiteCardContainer
                key={index}
                ref={isNextEmpty ? nextSlotRef : null}
                $isCurrent={isP0Here || isP1Here}
                $index={index}
                $isHovered={isHovered}
                $hasSite={Boolean(site)}
                onMouseEnter={() => {
                    if (site) {
                        setHoveredCard(site, 'landscape');
                    }
                }}
                onMouseLeave={() => setHoveredCard(null)}
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
