import React, {
    useState,
    useEffect,
    useRef,
} from 'react';
import type { CardState, SiteCardState } from '../game/types';
import { Card } from '../views/GameBoard/components/Card';
import { SiteCard } from '../views/GameBoard/components/SiteCard';
import {
    DragContext,
    useDrag,
    type CardOrientation,
    type CardOrigin,
    type DraggedCardData,
} from './DragContext'; // Ajustez le chemin d'import selon votre arborescence

const getXScale = (): number => {
    const scaledBoard = document.querySelector('[class*="ScaledView"]');
    if (!scaledBoard) return 1;
    const rect = scaledBoard.getBoundingClientRect();
    return rect.width / 1920;
};

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [dragged, setDragged] = useState<DraggedCardData | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);
    const lastX = useRef(0);

    const targetsRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const activeTargetIdRef = useRef<string | null>(null);
    const currentScale = useRef(1);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (dragged) {
            document.body.classList.add('is-dragging');
        } else {
            document.body.classList.remove('is-dragging');
        }
        return () => {
            document.body.classList.remove('is-dragging');
        };
    }, [dragged]);

    const registerTarget = (id: string, element: HTMLDivElement | null) => {
        if (element) {
            targetsRef.current.set(id, element);
        } else {
            targetsRef.current.delete(id);
        }
    };

    const getHitTargetId = (
        clientX: number,
        clientY: number,
        cardWidthPhysBase: number,
        cardHeightPhysBase: number
    ): string | null => {
        const scale = currentScale.current;
        const cardWidthPhys = cardWidthPhysBase * scale;
        const cardHeightPhys = cardHeightPhysBase * scale;
        const cardLeftPhys = clientX - dragOffset.current.x * scale;
        const cardTopPhys = clientY - dragOffset.current.y * scale;
        const cardRightPhys = cardLeftPhys + cardWidthPhys;
        const cardBottomPhys = cardTopPhys + cardHeightPhys;

        const cardArea = cardWidthPhys * cardHeightPhys;

        let bestCompanionId: string | null = null;
        let maxCompanionOverlap = 0;

        let bestZoneId: string | null = null;
        let maxZoneOverlapRatio = 0;

        targetsRef.current.forEach((targetEl, id) => {
            if (!targetEl) return;

            const targetRect = targetEl.getBoundingClientRect();

            const xOverlap = Math.max(
                0,
                Math.min(cardRightPhys, targetRect.right) -
                    Math.max(cardLeftPhys, targetRect.left)
            );
            const yOverlap = Math.max(
                0,
                Math.min(cardBottomPhys, targetRect.bottom) -
                    Math.max(cardTopPhys, targetRect.top)
            );
            const overlapArea = xOverlap * yOverlap;

            if (overlapArea <= 0) return;

            const cardOverlapRatio = overlapArea / cardArea;

            if (
                id === 'fellowshipArea' ||
                id === 'sitePath' ||
                id === 'supportArea' ||
                id === 'battlefield'
            ) {
                const ZONE_THRESHOLD = 0.2;

                if (
                    cardOverlapRatio > ZONE_THRESHOLD &&
                    cardOverlapRatio > maxZoneOverlapRatio
                ) {
                    maxZoneOverlapRatio = cardOverlapRatio;
                    bestZoneId = id;
                }
            } else {
                const targetArea = targetRect.width * targetRect.height;
                const targetOverlapRatio = overlapArea / targetArea;

                if (
                    targetOverlapRatio > 0.05 &&
                    targetOverlapRatio > maxCompanionOverlap
                ) {
                    maxCompanionOverlap = targetOverlapRatio;
                    bestCompanionId = id;
                }
            }
        });

        if (bestCompanionId) {
            return bestCompanionId;
        }

        return bestZoneId || null;
    };

    const startDrag = (
        card: CardState | SiteCardState,
        index: number,
        e: React.PointerEvent,
        origin: CardOrigin = 'HAND',
        orientation: CardOrientation = 'portrait',
        parentId?: string
    ) => {
        e.preventDefault();

        const scale = getXScale();
        currentScale.current = scale;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const board = document
            .querySelector('[class*="ScaledView"]')
            ?.getBoundingClientRect();
        const boardLeft = board ? board.left : 0;
        const boardTop = board ? board.top : 0;

        dragOffset.current = {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale,
        };

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        lastX.current = e.clientX;

        setDragged({ card, index, origin, orientation, parentId });

        setPosition({
            x: (e.clientX - boardLeft) / scale,
            y: (e.clientY - boardTop) / scale,
        });
    };

    const stopDrag = () => {
        setDragged(null);
        setActiveTargetId(null);
        setRotation(0);
    };

    useEffect(() => {
        if (!dragged) return;

        const isLandscape = dragged.orientation === 'landscape';
        const cardWidthPhysBase = isLandscape ? 180 : 130;
        const cardHeightPhysBase = isLandscape ? 110 : 180;

        const handlePointerMove = (e: PointerEvent) => {
            const board = document
                .querySelector('[class*="ScaledView"]')
                ?.getBoundingClientRect();
            const boardLeft = board ? board.left : 0;
            const boardTop = board ? board.top : 0;
            const scale = currentScale.current;

            const virtualX = (e.clientX - boardLeft) / scale;
            const virtualY = (e.clientY - boardTop) / scale;

            setPosition({ x: virtualX, y: virtualY });

            const deltaX = e.clientX - lastX.current;
            lastX.current = e.clientX;
            const targetRotation = Math.max(-8, Math.min(8, deltaX * 0.4));
            setRotation((prev) => prev + (targetRotation - prev) * 0.15);

            const detectedTargetId = getHitTargetId(
                e.clientX,
                e.clientY,
                cardWidthPhysBase,
                cardHeightPhysBase
            );

            setActiveTargetId(detectedTargetId);
            activeTargetIdRef.current = detectedTargetId;
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (dragged) {
                const finalTargetId = getHitTargetId(
                    e.clientX,
                    e.clientY,
                    cardWidthPhysBase,
                    cardHeightPhysBase
                );
                const targetToUse = finalTargetId || activeTargetIdRef.current;

                const dropEvent = new CustomEvent('card-dropped', {
                    detail: { draggedCard: dragged, targetId: targetToUse },
                });
                window.dispatchEvent(dropEvent);
            }
            activeTargetIdRef.current = null;
            stopDrag();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [dragged]);

    return (
        <DragContext.Provider
            value={{
                dragged,
                position,
                rotation,
                activeTargetId,
                startDrag,
                stopDrag,
                registerTarget,
            }}
        >
            {children}
            {dragged && <DragPortal />}
        </DragContext.Provider>
    );
};

const DragPortal: React.FC = () => {
    const { dragged, position, rotation } = useDrag();
    if (!dragged) return null;

    const isLandscape = dragged.orientation === 'landscape';

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                transform: `rotate(${rotation}deg) scale(1)`,
                pointerEvents: 'none',
                zIndex: 9999,
                opacity: 0.95,
                filter: 'drop-shadow(4px 4px 4px rgba(0, 0, 0, 0.5)) drop-shadow(0 15px 25px rgba(0, 0, 0, 0.3))',
            }}
        >
            <div
                style={{
                    transform: isLandscape
                        ? 'translate(-90px, -55px)'
                        : 'translate(-65px, -90px)',
                }}
            >
                {isLandscape ? (
                    <SiteCard site={dragged.card as SiteCardState} size="md" />
                ) : (
                    <Card card={dragged.card as CardState} size="md" />
                )}
            </div>
        </div>
    );
};