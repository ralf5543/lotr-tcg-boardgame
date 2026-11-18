import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import type { CardState, SiteCardState } from '../game/types';
import { Card } from '../views/GameBoard/components/Card';
import { SiteCard } from '../views/GameBoard/components/SiteCard';
import { TargetingArrow } from '../views/GameBoard/components/TargetingArrow';
import { playableEventHalo } from '../views/GameBoard/cardHalo';
import { isDesignationTargetId } from '../game/engine/abilities/designation';
import { PENDING_PLAY_ORIGIN_ID } from '../views/GameBoard/components/TargetingArrow/sync';
import { usePublishTargetingArrow } from '../views/GameBoard/components/TargetingArrow/TargetingArrowSync';
import {
    DragContext,
    useDrag,
    type CardOrientation,
    type CardOrigin,
    type DraggedCardData,
    HAND_CANCEL_VIRTUAL_Y,
} from './DragContext';
import {
    isGlobalZoneId,
    isNestedOnHostElement,
    pickHitTargetId,
    type HitCandidate,
} from './pickHitTargetId';

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

/**
 * Réglages penchant (drag main + sites landscape).
 * - DECAY : frein vitesse/frame (↑ = retombe plus lent, ex. 0.97)
 * - FOLLOW : poursuite du penchant vers la cible (↑ = plus nerveux, ↓ = plus soft)
 * - IMPULSE : force ajoutée par pixel de souris (↑ = démarre plus fort)
 * - *_GAIN : amplification axe (Z = plat, Y = gauche/droite 3D, X = haut/bas 3D)
 * - *_MAX : angle max en degrés / plafond de vitesse
 */
const TILT_VEL_DECAY = 0.955;
const TILT_FOLLOW = 0.1;
const TILT_IMPULSE = 0.1;
const TILT_Z_GAIN = 0.55;
const TILT_Y_GAIN = 1.35;
const TILT_X_GAIN = 1.15;
const TILT_Z_MAX = 14;
const TILT_Y_MAX = 32;
const TILT_X_MAX = 26;
const TILT_VEL_MAX = 48;

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

const ZERO_TILT = { x: 0, y: 0, z: 0 };

/** Main, ou site (picker → origin BOARD + landscape). */
const shouldApplyDragTilt = (dragged: DraggedCardData) =>
    dragged.origin === 'HAND' || dragged.orientation === 'landscape';

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [dragged, setDragged] = useState<DraggedCardData | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
    const [tilt, setTilt] = useState(ZERO_TILT);
    const [isOverHandCancel, setIsOverHandCancel] = useState(false);
    const [arrowOrigin, setArrowOrigin] = useState<{ x: number; y: number } | null>(
        null
    );
    const lastPointer = useRef({ x: 0, y: 0 });
    const velRef = useRef({ x: 0, y: 0 });
    const tiltRef = useRef({ ...ZERO_TILT });
    const tiltRafRef = useRef<number | null>(null);

    const targetsRef = useRef<Map<string, HTMLElement>>(new Map());
    const arrowAnchorsRef = useRef<Map<string, HTMLElement>>(new Map());
    const activeTargetIdRef = useRef<string | null>(null);
    const currentScale = useRef(1);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!dragged) {
            document.body.classList.remove('is-dragging');
            document.body.classList.remove('is-targeting-drag');
            return;
        }
        const showArrow =
            Boolean(dragged.designationTargetIds?.length) &&
            !isOverHandCancel;
        if (showArrow) {
            document.body.classList.remove('is-dragging');
            document.body.classList.add('is-targeting-drag');
        } else {
            document.body.classList.add('is-dragging');
            document.body.classList.remove('is-targeting-drag');
        }
        return () => {
            document.body.classList.remove('is-dragging');
            document.body.classList.remove('is-targeting-drag');
        };
    }, [dragged, isOverHandCancel]);

    const registerTarget = (id: string, element: HTMLElement | null) => {
        if (element) {
            targetsRef.current.set(id, element);
        } else {
            targetsRef.current.delete(id);
        }
    };

    const registerArrowAnchor = (
        id: string,
        element: HTMLElement | null
    ) => {
        if (element) {
            arrowAnchorsRef.current.set(id, element);
        } else {
            arrowAnchorsRef.current.delete(id);
        }
    };

    const getHitTargetId = (
        clientX: number,
        clientY: number,
        allowedIds?: string[]
    ): string | null => {
        // Situation / possession d’aire de soutien : les cartes déjà posées
        // ne doivent pas « manger » la zone (sinon pas de halo / pas de pose).
        const preferSupportZone =
            dragged?.origin === 'HAND' &&
            (dragged.card as { subtype?: string } | undefined)?.subtype ===
                'SUPPORT-AREA';

        const candidates: HitCandidate[] = [];

        targetsRef.current.forEach((targetEl, id) => {
            if (!targetEl) return;

            const rect = targetEl.getBoundingClientRect();

            const isCursorInside =
                clientX >= rect.left &&
                clientX <= rect.right &&
                clientY >= rect.top &&
                clientY <= rect.bottom;

            if (!isCursorInside) return;

            const isZone = isGlobalZoneId(id);
            candidates.push({
                id,
                isZone,
                isNestedOnHost: !isZone && isNestedOnHostElement(targetEl),
                area: Math.max(1, rect.width * rect.height),
            });
        });

        return pickHitTargetId(candidates, {
            allowedIds,
            preferSupportZone,
        });
    };

    const getTargetVirtualCenter = (
        id: string
    ): { x: number; y: number } | null => {
        const el =
            arrowAnchorsRef.current.get(id) || targetsRef.current.get(id);
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
        lastPointer.current = { x: e.clientX, y: e.clientY };
        velRef.current = { x: 0, y: 0 };
        tiltRef.current = { ...ZERO_TILT };
        setTilt(ZERO_TILT);

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
        if (tiltRafRef.current != null) {
            cancelAnimationFrame(tiltRafRef.current);
            tiltRafRef.current = null;
        }
        velRef.current = { x: 0, y: 0 };
        tiltRef.current = { ...ZERO_TILT };
        setDragged(null);
        setActiveTargetId(null);
        setTilt(ZERO_TILT);
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

            const deltaX = e.clientX - lastPointer.current.x;
            const deltaY = e.clientY - lastPointer.current.y;
            lastPointer.current = { x: e.clientX, y: e.clientY };
            // Impulsion → inertie (le rAF lisse et retombe lentement).
            velRef.current.x = clamp(
                velRef.current.x + deltaX * TILT_IMPULSE,
                -TILT_VEL_MAX,
                TILT_VEL_MAX
            );
            velRef.current.y = clamp(
                velRef.current.y + deltaY * TILT_IMPULSE,
                -TILT_VEL_MAX,
                TILT_VEL_MAX
            );

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

    // Penchant continu : attaque sur la vitesse, relâchement lent (anti-saccades).
    useEffect(() => {
        if (!dragged || !shouldApplyDragTilt(dragged)) {
            if (tiltRafRef.current != null) {
                cancelAnimationFrame(tiltRafRef.current);
                tiltRafRef.current = null;
            }
            return;
        }

        const tick = () => {
            velRef.current.x *= TILT_VEL_DECAY;
            velRef.current.y *= TILT_VEL_DECAY;

            // Même signe que le geste : la carte penche du côté où elle va.
            // rotateY : bord d’attaque vers la caméra ; rotateX : idem en vertical.
            const targetZ = clamp(
                velRef.current.x * TILT_Z_GAIN,
                -TILT_Z_MAX,
                TILT_Z_MAX
            );
            const targetY = clamp(
                velRef.current.x * TILT_Y_GAIN,
                -TILT_Y_MAX,
                TILT_Y_MAX
            );
            const targetX = clamp(
                -velRef.current.y * TILT_X_GAIN,
                -TILT_X_MAX,
                TILT_X_MAX
            );

            const prev = tiltRef.current;
            const next = {
                x: prev.x + (targetX - prev.x) * TILT_FOLLOW,
                y: prev.y + (targetY - prev.y) * TILT_FOLLOW,
                z: prev.z + (targetZ - prev.z) * TILT_FOLLOW,
            };
            tiltRef.current = next;
            setTilt(next);
            tiltRafRef.current = requestAnimationFrame(tick);
        };

        tiltRafRef.current = requestAnimationFrame(tick);
        return () => {
            if (tiltRafRef.current != null) {
                cancelAnimationFrame(tiltRafRef.current);
                tiltRafRef.current = null;
            }
        };
    }, [dragged]);

    return (
        <DragContext.Provider
            value={{
                dragged,
                position,
                tilt,
                activeTargetId,
                startDrag,
                stopDrag,
                registerTarget,
                registerArrowAnchor,
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

const DragHalo = styled.div<{ $playable?: boolean }>`
    border-radius: 4px;
    ${({ $playable }) => $playable && playableEventHalo}
`;

/** Silhouette au sol : clone noir flouté, pas un box-shadow. */
const DragTableShadow = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.42;
    filter: brightness(0) blur(9px);
    transform-origin: center center;
    will-change: transform;
`;

const DragLiftedCard = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.98;
    transform-origin: center center;
    will-change: transform;
`;

const dragCardAnchorTranslate = (isLandscape: boolean) =>
    isLandscape ? 'translate(-90px, -55px)' : 'translate(-65px, -90px)';

const DragPortal: React.FC = () => {
    const { dragged, position, tilt, isOverHandCancel } = useDrag();
    if (!dragged) return null;

    const isLandscape = dragged.orientation === 'landscape';
    const showArrow =
        Boolean(dragged.designationTargetIds?.length) && !isOverHandCancel;
    if (showArrow) return null;

    const showPlayHalo =
        dragged.origin === 'HAND' && dragged.isPlayableEvent && !isLandscape;

    // Perspective écran : le site garde son rotate(90°) interne ; on penche
    // le wrapper (axes écran, pas locaux à la carte).
    const useTilt = shouldApplyDragTilt(dragged);
    const tiltTransform = useTilt
        ? `perspective(920px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateZ(${tilt.z}deg)`
        : `rotate(${tilt.z}deg)`;
    // Ombre « au plateau » : lumière globale haut-gauche → bas-droite
    // (même orientation, un peu moins penchée 3D + enfoncée en Z).
    const shadowTransform = useTilt
        ? `perspective(920px) translate3d(22px, 68px, -200px) rotateX(${tilt.x * 0.75}deg) rotateY(${tilt.y * 0.75}deg) rotateZ(${tilt.z}deg)`
        : `translate(18px, 40px) rotate(${tilt.z}deg)`;

    const anchorStyle = {
        transform: dragCardAnchorTranslate(isLandscape),
    } as const;

    const renderCardFace = () =>
        isLandscape ? (
            <SiteCard site={dragged.card as SiteCardState} size="md" />
        ) : (
            <Card
                card={dragged.card as CardState}
                size="md"
                isFaceDown={false}
            />
        );

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                pointerEvents: 'none',
                zIndex: 9999,
                transformStyle: useTilt ? 'preserve-3d' : undefined,
            }}
        >
            {useTilt && (
                <DragTableShadow style={{ transform: shadowTransform }}>
                    <div style={anchorStyle}>{renderCardFace()}</div>
                </DragTableShadow>
            )}
            <DragLiftedCard style={{ transform: tiltTransform }}>
                <div style={anchorStyle}>
                    {isLandscape ? (
                        renderCardFace()
                    ) : (
                        <DragHalo $playable={showPlayHalo}>
                            {renderCardFace()}
                        </DragHalo>
                    )}
                </div>
            </DragLiftedCard>
        </div>
    );
};

const DragTargetingArrow: React.FC = () => {
    const {
        dragged,
        position,
        isOverHandCancel,
        arrowOrigin,
        activeTargetId,
        getTargetVirtualCenter,
    } = useDrag();
    const isActive = Boolean(
        dragged && !isOverHandCancel && dragged.designationTargetIds?.length
    );
    const draggedCard = dragged?.card as CardState | undefined;
    const fromCardId = !isActive
        ? null
        : dragged?.origin === 'HAND'
          ? PENDING_PLAY_ORIGIN_ID
          : draggedCard?.instanceId || draggedCard?.id || null;
    const isValid = isDesignationTargetId(
        dragged?.designationTargetIds,
        activeTargetId
    );
    usePublishTargetingArrow(
        isActive,
        fromCardId,
        isValid ? activeTargetId : null
    );

    if (!isActive || !dragged) {
        return null;
    }
    const from = arrowOrigin ?? position;
    const targetCenter = isValid
        ? getTargetVirtualCenter(activeTargetId as string)
        : null;

    return (
        <TargetingArrow
            from={from}
            to={targetCenter ?? position}
            isValidTarget={isValid}
        />
    );
};
