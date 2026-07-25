import React from 'react';
import type { SiteCard as SiteCardType } from '../../../../game/types';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import { SiteCard } from '../SiteCard';

interface SitesPickerProps {
    sites: SiteCardType[];
}

export const SitesPicker: React.FC<SitesPickerProps> = ({ sites = [] }) => {
    const { startDrag, dragged } = useDrag();
    const { setHoveredCard } = useHoverCard();

    if (sites.length === 0) {
        return <S.EmptyText>Aucun site restant dans votre réserve.</S.EmptyText>;
    }

    return (
        <S.PickerContainer>
            <S.Grid>
                {sites.map((site, idx) => {
                    const isBeingDragged = dragged?.card.id === site.id;

                    return (
                        <div
                            key={site.id}
                            data-draggable="true"
                            style={{
                                opacity: isBeingDragged ? 0 : 1,
                                pointerEvents: isBeingDragged ? 'none' : 'auto',
                                cursor: 'grab',
                            }}
                            onMouseEnter={() => setHoveredCard(site, 'landscape')}
                            onMouseLeave={() => setHoveredCard(null)}
                            onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                e.preventDefault();
                                setHoveredCard(null);
                                startDrag(site as any, idx, e, 'BOARD', 'landscape');
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