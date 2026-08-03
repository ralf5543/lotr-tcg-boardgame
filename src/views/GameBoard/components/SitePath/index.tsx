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

            if (targetId === 'sitePath') {
                const siteId = draggedCard?.card?.id;


                if (siteId && onPlaySite) {
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

    // 🟢 Récupération des deux joueurs pour extraire facilement leurs profils
    const p0 = players?.['0'];
    const p1 = players?.['1'];

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
                Chemin d'Aventure
            </h3>

            <S.SitesGrid>
                {slots.map((site, index) => {
                    const isNextEmpty = index === nextEmptyIndex;

                    const isHovered =
                        isNextEmpty &&
                        activeTargetId === 'sitePath' &&
                        dragged?.orientation === 'landscape';

                    // Vérification de la présence des joueurs sur l'index courant
                    const isP0Here = p0?.currentSiteIndex === index;
                    const isP1Here = p1?.currentSiteIndex === index;
                    const regionBonus = getRegionBonus(index);

                    // 🟢 Préparation des données complètes pour playersHere
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
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                        pointerEvents: 'none',
                                        backgroundColor: 'rgb(26, 37, 47)',
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
                                            fontWeight: isHovered
                                                ? 'bold'
                                                : 'normal',
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