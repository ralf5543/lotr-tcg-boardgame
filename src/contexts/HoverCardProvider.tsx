import React, { useState, type ReactNode } from 'react';
import type { CardState, SiteCardState } from '../game/types';
import {
    HoverCardContext,
    type CardOrientation,
    type HoveredCardData,
} from './HoverCardContext';

export const HoverCardProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [hoveredData, setHoveredData] = useState<HoveredCardData | null>(null);

    const setHoveredCard = (
        card: CardState | SiteCardState | null,
        orientation: CardOrientation = 'portrait'
    ) => {
        if (!card) {
            setHoveredData(null);
        } else {
            setHoveredData({ card, orientation });
        }
    };

    return (
        <HoverCardContext.Provider value={{ hoveredData, setHoveredCard }}>
            {children}
        </HoverCardContext.Provider>
    );
};