import { createContext, useContext } from 'react';
import type { CardState, SiteCardState } from '../game/types';

export type CardOrientation = 'portrait' | 'landscape';
export type CardOrigin = 'HAND' | 'BOARD' | 'ATTACHMENT' | 'BATTLEFIELD' | 'SUPPORT_AREA';

export interface DraggedCardData {
    card: CardState | SiteCardState;
    index: number;
    kind?: 'FREE_PEOPLE' | 'SHADOW';
    origin: CardOrigin;
    orientation: CardOrientation;
    parentId?: string;
}

export interface DragContextType {
    dragged: DraggedCardData | null;
    position: { x: number; y: number };
    activeTargetId: string | null;
    startDrag: (
        card: CardState | SiteCardState,
        index: number,
        e: React.PointerEvent,
        origin?: CardOrigin,
        orientation?: CardOrientation,
        parentId?: string
    ) => void;
    stopDrag: () => void;
    registerTarget: (id: string, element: HTMLDivElement | null) => void;
    rotation: number;
}

export const DragContext = createContext<DragContextType | undefined>(undefined);

export const useDrag = (): DragContextType => {
    const context = useContext(DragContext);
    if (!context) {
        throw new Error('useDrag doit être utilisé dans un DragProvider');
    }
    return context;
};