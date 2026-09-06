import { createContext, useContext } from 'react';
import type { CardState, SiteCardState } from '../game/types';

export type CardOrientation = 'portrait' | 'landscape';
export type CardOrigin = 'HAND' | 'BOARD' | 'ATTACHMENT' | 'BATTLEFIELD' | 'SUPPORT_AREA';

/** En coords design (1080), sous ce Y le drop d'événement est un cancel (main / dock). */
export const HAND_CANCEL_VIRTUAL_Y = 820;

export interface DraggedCardData {
    card: CardState | SiteCardState;
    index: number;
    kind?: 'FREE_PEOPLE' | 'SHADOW';
    origin: CardOrigin;
    orientation: CardOrientation;
    parentId?: string;
    isPlayableEvent?: boolean;
    designationTargetIds?: string[];
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
        parentId?: string,
        isPlayableEvent?: boolean,
        designationTargetIds?: string[]
    ) => void;
    stopDrag: () => void;
    registerTarget: (id: string, element: HTMLDivElement | null) => void;
    rotation: number;
    isOverHandCancel: boolean;
    arrowOrigin: { x: number; y: number } | null;
    getHitTargetId: (
        clientX: number,
        clientY: number,
        allowedIds?: string[]
    ) => string | null;
    getTargetVirtualCenter: (id: string) => { x: number; y: number } | null;
    getVirtualCursor: (clientX: number, clientY: number) => { x: number; y: number };
}

export const DragContext = createContext<DragContextType | undefined>(undefined);

export const useDrag = (): DragContextType => {
    const context = useContext(DragContext);
    if (!context) {
        throw new Error('useDrag doit être utilisé dans un DragProvider');
    }
    return context;
};