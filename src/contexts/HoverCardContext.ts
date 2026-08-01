import { createContext, useContext } from 'react';
import type { CardState, SiteCardState } from '../game/types';

export type CardOrientation = 'portrait' | 'landscape';

export interface HoveredCardData {
    card: CardState | SiteCardState;
    orientation?: CardOrientation;
}

export interface HoverCardContextType {
    hoveredData: HoveredCardData | null;
    setHoveredCard: (
        card: CardState | SiteCardState | null,
        orientation?: CardOrientation
    ) => void;
}

export const HoverCardContext = createContext<HoverCardContextType | undefined>(
    undefined
);

export const useHoverCard = (): HoverCardContextType => {
    const context = useContext(HoverCardContext);
    if (!context) {
        throw new Error(
            "useHoverCard doit être utilisé à l'intérieur de HoverCardProvider"
        );
    }
    return context;
};