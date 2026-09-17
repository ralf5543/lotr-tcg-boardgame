import React from 'react';
import type { SiteCardState } from '../../../../game/types';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { SiteCard } from '../SiteCard';

interface SitesPickerProps {
    sites: SiteCardState[];
}

export const SitesPicker: React.FC<SitesPickerProps> = ({ sites = [] }) => {
    const { startDrag, dragged } = useDrag();
    const { setHoveredCard } = useHoverCard();
    const {
        targetingKind,
        isCardTargetable,
        selectCard,
        isTargetingActive,
    } = useTargeting();
    const isSiteReplace = targetingKind === 'SITE_REPLACE';

    if (sites.length === 0) {
        return (
            <S.EmptyText>Aucun site restant dans votre réserve.</S.EmptyText>
        );
    }

    return (
        <S.PickerContainer>
            <S.Grid>
                {sites.map((site, idx) => {
                    const siteKey = site.instanceId || site.id;
                    const isBeingDragged = dragged?.card.id === site.id;
                    const targetable =
                        isSiteReplace &&
                        isTargetingActive &&
                        isCardTargetable(siteKey);
                    const dimmed =
                        isSiteReplace && isTargetingActive && !targetable;

                    return (
                        <div
                            key={siteKey}
                            data-draggable={!isSiteReplace ? 'true' : undefined}
                            style={{
                                opacity: isBeingDragged || dimmed ? 0.35 : 1,
                                pointerEvents: isBeingDragged
                                    ? 'none'
                                    : 'auto',
                                cursor: targetable
                                    ? 'pointer'
                                    : isSiteReplace
                                      ? 'default'
                                      : 'grab',
                                outline: targetable
                                    ? '2px solid rgba(255, 220, 120, 0.9)'
                                    : undefined,
                                outlineOffset: 2,
                            }}
                            onMouseEnter={() =>
                                setHoveredCard(site, 'landscape')
                            }
                            onMouseLeave={() => setHoveredCard(null)}
                            onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                if (isSiteReplace) {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (targetable) {
                                        setHoveredCard(null);
                                        selectCard(siteKey);
                                    }
                                    return;
                                }
                                e.stopPropagation();
                                e.preventDefault();
                                setHoveredCard(null);
                                startDrag(site, idx, e, 'BOARD', 'landscape');
                            }}
                        >
                            <SiteCard site={site} size="md" />
                        </div>
                    );
                })}
            </S.Grid>
        </S.PickerContainer>
    );
};
