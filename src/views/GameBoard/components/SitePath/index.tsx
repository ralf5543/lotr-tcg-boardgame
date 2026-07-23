// src/components/SitePath.tsx
import React, { useEffect, useRef } from 'react';
import type { SiteCardState, PlayerState } from '../../../../game/types';
import { SiteCard } from '../SiteCard';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useHoverCard } from '../../../../contexts/HoverCardContext';

interface SitePathProps {
    path: (SiteCardState | null)[];
    players?: Record<string, PlayerState>;
    onPlaySite?: (siteId: string, targetIndex: number) => void;
}

const getRegionBonus = (index: number): number => {
    if (index <= 2) return 0;
    if (index <= 5) return 3;
    return 6;
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

    // 1. Enregistrement de la cible
    useEffect(() => {
        console.log(
            '📌 [SITEPATH] Target registration for index:',
            nextEmptyIndex,
            'Element:',
            nextSlotRef.current
        );
        if (nextSlotRef.current) {
            registerTarget('sitePath', nextSlotRef.current);
        } else {
            registerTarget('sitePath', null);
        }
        return () => registerTarget('sitePath', null);
    }, [nextEmptyIndex, registerTarget]);

    // 2. Écoute du Drop Event
    useEffect(() => {
        const handleCardDropped = (e: CustomEvent) => {
            const { draggedCard, targetId } = e.detail;

            console.log('💥 [SITEPATH DROP HEARD]:', {
                draggedCard,
                targetId,
                nextEmptyIndex,
                hasOnPlaySite: !!onPlaySite,
            });

            // On ne réagit QUE si la cible est bien sitePath
            if (targetId === 'sitePath') {
                const siteId = draggedCard?.card?.id;
                console.log(
                    '🎯 [SITEPATH] Valid drop target detected! Card ID:',
                    siteId
                );

                if (siteId && onPlaySite) {
                    console.log(
                        `🚀 [SITEPATH] Executing onPlaySite(${siteId}, ${nextEmptyIndex})`
                    );
                    onPlaySite(siteId, nextEmptyIndex);
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

    return (
        <S.SitespathContainer>
            <h3
                style={{
                    margin: '0 0 8px 0',
                    color: '#e2c044',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                }}
            >
                Chemin d'Aventure (Path)
            </h3>

            <S.SitesGrid>
                {slots.map((site, index) => {
                    const isNextEmpty = index === nextEmptyIndex;
                    
                    // Un slot est en survol actif SI c'est le slot valide ET que la carte attrapée est un site paysage
                    const isHovered =
                        isNextEmpty &&
                        activeTargetId === 'sitePath' &&
                        dragged?.orientation === 'landscape';

                    const p0Here = players?.['0']?.currentSiteIndex === index;
                    const p1Here = players?.['1']?.currentSiteIndex === index;
                    const regionBonus = getRegionBonus(index);

                    return (
                        <S.SiteCardContainer
                            key={index}
                            ref={isNextEmpty ? nextSlotRef : null}
                            $isCurrent={p0Here || p1Here}
                            style={{
                                border: isHovered
                                    ? '2px solid #e2c044'
                                    : undefined,
                                boxShadow: isHovered
                                    ? '0 0 16px rgba(226, 192, 68, 0.8), inset 0 0 8px rgba(226, 192, 68, 0.3)'
                                    : undefined,
                                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                transition: 'all 0.15s ease-in-out',
                            }}
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
                                    playersHere={{ p0: p0Here, p1: p1Here }}
                                />
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                        opacity: isNextEmpty ? 1 : 0.4,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        Site {index + 1}
                                    </span>
                                    <small
                                        style={{
                                            fontSize: '10px',
                                            color: isNextEmpty
                                                ? '#e2c044'
                                                : '#888',
                                            fontWeight: isHovered ? 'bold' : 'normal',
                                        }}
                                    >
                                        {isNextEmpty
                                            ? isHovered
                                                ? '✨ Lâcher ici !'
                                                : '🎯 Poser ici'
                                            : 'Inexploré'}
                                    </small>
                                    {regionBonus > 0 && (
                                        <span
                                            style={{
                                                fontSize: '9px',
                                                color: '#aaa',
                                                marginTop: '2px',
                                            }}
                                        >
                                            +{regionBonus} 🌙
                                        </span>
                                    )}
                                </div>
                            )}
                        </S.SiteCardContainer>
                    );
                })}
            </S.SitesGrid>
        </S.SitespathContainer>
    );
};