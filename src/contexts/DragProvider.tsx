import React, { useState, useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';
import type { CardState, SiteCardState } from '../game/types';
import { Card } from '../views/GameBoard/components/Card';
import { SiteCard } from '../views/GameBoard/components/SiteCard';
import { TargetingArrow } from '../views/GameBoard/components/TargetingArrow';
import { playableEventHalo, spotMetHalo } from '../views/GameBoard/cardHalo';
import { isDesignationTargetId } from '../game/engine/abilities/designation';
import {
    DragContext,
    useDrag,
    type CardOrientation,
    type CardOrigin,
    type DraggedCardData,
    HAND_CANCEL_VIRTUAL_Y,
} from './DragContext';

const getXScale = (): number => {
    const scaledBoard = document.querySelector('[class*="ScaledView"]');
    if (!scaledBoard) return 1;
    const rect = scaledBoard.getBoundingClientRect();
    return rect.width / 1920;
};

const getVirtualPoint = (
    clientX: number,
    clientY: number,
    scale: number
): { x: number; y: number } => {
    const board = document
        .querySelector('[class*="ScaledView"]')
        ?.getBoundingClientRect();
    const boardLeft = board ? board.left : 0;
    const boardTop = board ? board.top : 0;
    return {
        x: (clientX - boardLeft) / scale,
        y: (clientY - boardTop) / scale,
    };
};

const isInHandCancelZone = (virtualY: number): boolean =>
    virtualY >= HAND_CANCEL_VIRTUAL_Y;

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [dragged, setDragged] = useState<DraggedCardData | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);
    const [isOverHandCancel, setIsOverHandCancel] = useState(false);
    const [arrowOrigin, setArrowOrigin] = useState<{ x: number; y: number } | null>(
        null
    );
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
        allowedIds?: string[]
    ): string | null => {
        let detectedCompanionId: string | null = null;
        let detectedZoneId: string | null = null;
        const restrictToDesignation = Boolean(allowedIds?.length);

        targetsRef.current.forEach((targetEl, id) => {
            if (!targetEl) return;

            const rect = targetEl.getBoundingClientRect();

            const isCursorInside =
                clientX >= rect.left &&
                clientX <= rect.right &&
                clientY >= rect.top &&
                clientY <= rect.bottom;

            if (!isCursorInside) return;

            const isGlobalZone =
                id === 'fellowshipArea' ||
                id === 'sitePath' ||
                id === 'supportArea' ||
                id === 'battlefield';

            if (restrictToDesignation) {
                if (!isGlobalZone && allowedIds!.includes(id)) {
                    detectedCompanionId = id;
                }
                return;
            }

            if (isGlobalZone) {
                detectedZoneId = id;
            } else {
                detectedCompanionId = id;
            }
        });

        return detectedCompanionId || detectedZoneId || null;
    };

    const getTargetVirtualCenter = (
        id: string
    ): { x: number; y: number } | null => {
        const el = targetsRef.current.get(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return getVirtualPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            getXScale()
        );
    };

    const getVirtualCursor = (clientX: number, clientY: number) =>
        getVirtualPoint(clientX, clientY, getXScale());

    const startDrag = (
        card: CardState | SiteCardState,
        index: number,
        e: React.PointerEvent,
        origin: CardOrigin = 'HAND',
        orientation: CardOrientation = 'portrait',
        parentId?: string,
        isPlayableEvent?: boolean,
        designationTargetIds?: string[]
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

        //(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        lastX.current = e.clientX;

        setDragged({
            card,
            index,
            origin,
            orientation,
            parentId,
            isPlayableEvent,
            designationTargetIds,
        });
        const startY = (e.clientY - boardTop) / scale;
        const startInCancel = isInHandCancelZone(startY);
        setIsOverHandCancel(startInCancel);
        if (
            designationTargetIds?.length &&
            !startInCancel
        ) {
            setArrowOrigin({
                x: (e.clientX - boardLeft) / scale,
                y: startY,
            });
        } else {
            setArrowOrigin(null);
        }

        setPosition({
            x: (e.clientX - boardLeft) / scale,
            y: (e.clientY - boardTop) / scale,
        });
    };

    const stopDrag = () => {
        setDragged(null);
        setActiveTargetId(null);
        setRotation(0);
        setIsOverHandCancel(false);
        setArrowOrigin(null);
    };

    useEffect(() => {
        if (!dragged) return;

        const handlePointerMove = (e: PointerEvent) => {
            const scale = currentScale.current;
            const { x: virtualX, y: virtualY } = getVirtualPoint(
                e.clientX,
                e.clientY,
                scale
            );

            setPosition({ x: virtualX, y: virtualY });
            const inCancel = isInHandCancelZone(virtualY);
            setIsOverHandCancel(inCancel);

            const designationIds = dragged.designationTargetIds;
            if (designationIds?.length && !inCancel) {
                setArrowOrigin((prev) => prev ?? { x: virtualX, y: virtualY });
            } else {
                setArrowOrigin(null);
            }

            const deltaX = e.clientX - lastX.current;
            lastX.current = e.clientX;
            const targetRotation = Math.max(-8, Math.min(8, deltaX * 0.4));
            setRotation((prev) => prev + (targetRotation - prev) * 0.15);

            const detectedTargetId = getHitTargetId(
                e.clientX,
                e.clientY,
                inCancel ? undefined : designationIds
            );

            setActiveTargetId(detectedTargetId);
            activeTargetIdRef.current = detectedTargetId;
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (dragged) {
                const { y: virtualY } = getVirtualPoint(
                    e.clientX,
                    e.clientY,
                    currentScale.current
                );
                const inCancel = isInHandCancelZone(virtualY);
                const designationIds = dragged.designationTargetIds;
                const finalTargetId = getHitTargetId(
                    e.clientX,
                    e.clientY,
                    inCancel ? undefined : designationIds
                );
                const targetToUse = finalTargetId || activeTargetIdRef.current;
                const missedDesignation =
                    Boolean(designationIds?.length) &&
                    !isDesignationTargetId(designationIds, targetToUse);

                const dropEvent = new CustomEvent('card-dropped', {
                    detail: {
                        draggedCard: dragged,
                        targetId: targetToUse,
                        cancelled: inCancel || missedDesignation,
                    },
                });
                window.dispatchEvent(dropEvent);
            }
            activeTargetIdRef.current = null;
            stopDrag();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            window.dispatchEvent(
                new CustomEvent('card-dropped', {
                    detail: {
                        draggedCard: dragged,
                        cancelled: true,
                    },
                })
            );
            activeTargetIdRef.current = null;
            stopDrag();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('keydown', handleKeyDown);
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
                isOverHandCancel,
                arrowOrigin,
                getHitTargetId,
                getTargetVirtualCenter,
                getVirtualCursor,
            }}
        >
            {children}
            {dragged && <DragPortal />}
            {dragged && <DragTargetingArrow />}
        </DragContext.Provider>
    );
};

const DragHalo = styled.div<{ $mode?: 'playable' | 'ready' }>`
    border-radius: 4px;
    ${({ $mode }) => $mode === 'playable' && playableEventHalo}
    ${({ $mode }) =>
        $mode === 'ready' &&
        css`
            ${spotMetHalo}
            outline: none;
        `}
`;

const DragPortal: React.FC = () => {
    const { dragged, position, rotation, isOverHandCancel } = useDrag();
    if (!dragged) return null;

    const isLandscape = dragged.orientation === 'landscape';
    const showArrow =
        Boolean(dragged.designationTargetIds?.length) && !isOverHandCancel;
    if (showArrow) return null;

    const showPlayHalo =
        dragged.origin === 'HAND' && dragged.isPlayableEvent && !isLandscape;
    const haloMode = showPlayHalo
        ? isOverHandCancel
            ? 'playable'
            : 'ready'
        : undefined;

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
                    <DragHalo $mode={haloMode}>
                        <Card
                            card={dragged.card as CardState}
                            size="md"
                            isFaceDown={false}
                        />
                    </DragHalo>
                )}
            </div>
        </div>
    );
};

const DragTargetingArrow: React.FC = () => {
    const { dragged, position, isOverHandCancel, arrowOrigin, activeTargetId } =
        useDrag();
    if (!dragged || isOverHandCancel || !dragged.designationTargetIds?.length) {
        return null;
    }
    const from = arrowOrigin ?? position;
    const isValid = isDesignationTargetId(
        dragged.designationTargetIds,
        activeTargetId
    );

    return (
        <TargetingArrow from={from} to={position} isValidTarget={isValid} />
    );
};
