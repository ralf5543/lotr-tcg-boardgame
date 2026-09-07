import React, { useEffect, useState } from 'react';
import { useDrag } from '../../../../contexts/DragContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { usePublishTargetingArrow, useTargetingArrowSync } from './TargetingArrowSync';

const GOLD = '#e2c044';
const GOLD_DIM = 'rgba(226, 192, 68, 0.45)';

interface TargetingArrowProps {
    from: { x: number; y: number };
    to: { x: number; y: number };
    isValidTarget: boolean;
}

export const TargetingArrow: React.FC<TargetingArrowProps> = ({
    from,
    to,
    isValidTarget,
}) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) return null;

    const midX = (from.x + to.x) / 2;
    const bend = Math.min(90, dist * 0.28);
    const controlX = midX;
    const controlY = Math.min(from.y, to.y) - bend;

    const path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;

    const tx = to.x - controlX;
    const ty = to.y - controlY;
    const angle = Math.atan2(ty, tx);
    const head = 16;
    const leftX = to.x - head * Math.cos(angle - 0.45);
    const leftY = to.y - head * Math.sin(angle - 0.45);
    const rightX = to.x - head * Math.cos(angle + 0.45);
    const rightY = to.y - head * Math.sin(angle + 0.45);

    const color = isValidTarget ? GOLD : GOLD_DIM;
    const width = isValidTarget ? 5 : 3.5;

    return (
        <svg
            width="1920"
            height="1080"
            viewBox="0 0 1920 1080"
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 9998,
                overflow: 'visible',
            }}
        >
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                style={{
                    filter: isValidTarget
                        ? 'drop-shadow(0 0 6px rgba(226, 192, 68, 0.85))'
                        : 'none',
                }}
            />
            <polygon
                points={`${to.x},${to.y} ${leftX},${leftY} ${rightX},${rightY}`}
                fill={color}
            />
        </svg>
    );
};

export const BoardTargetingArrow: React.FC = () => {
    const {
        targetingKind,
        arrowFromCardId,
        targetableCardIds,
        selectCard,
        stopTargeting,
    } = useTargeting();
    const { getTargetVirtualCenter, getHitTargetId, getVirtualCursor } =
        useDrag();
    const [cursor, setCursor] = useState<{ x: number; y: number } | null>(
        null
    );
    const [hoverId, setHoverId] = useState<string | null>(null);
    const isDesignating =
        targetingKind === 'DESIGNATION' && Boolean(arrowFromCardId);

    const activeCursor = isDesignating ? cursor : null;
    const activeHoverId = isDesignating ? hoverId : null;

    usePublishTargetingArrow(
        isDesignating,
        arrowFromCardId ?? null,
        activeHoverId
    );

    useEffect(() => {
        if (!isDesignating) {
            return;
        }

        const hitFromEvent = (event: PointerEvent) =>
            getHitTargetId(event.clientX, event.clientY, targetableCardIds);

        const onMove = (event: PointerEvent) => {
            setCursor(getVirtualCursor(event.clientX, event.clientY));
            setHoverId(hitFromEvent(event));
        };

        const onPointerDown = (event: PointerEvent) => {
            const hit = hitFromEvent(event);
            if (hit) {
                selectCard(hit);
                return;
            }
            stopTargeting();
        };

        window.addEventListener('pointermove', onMove);
        const timer = window.setTimeout(() => {
            window.addEventListener('pointerdown', onPointerDown);
        }, 0);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onPointerDown);
        };
    }, [
        isDesignating,
        targetableCardIds,
        getHitTargetId,
        getVirtualCursor,
        selectCard,
        stopTargeting,
    ]);

    if (!isDesignating || !arrowFromCardId || !activeCursor) {
        return null;
    }

    const from = getTargetVirtualCenter(arrowFromCardId);
    const targetCenter = activeHoverId
        ? getTargetVirtualCenter(activeHoverId)
        : null;
    if (!from) return null;

    return (
        <TargetingArrow
            from={from}
            to={targetCenter ?? activeCursor}
            isValidTarget={Boolean(activeHoverId)}
        />
    );
};

export const RemoteTargetingArrow: React.FC = () => {
    const sync = useTargetingArrowSync();
    const { getTargetVirtualCenter } = useDrag();
    const fromId = sync?.remote?.fromCardId ?? null;
    const toId = sync?.remote?.toCardId ?? null;
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!fromId || !toId) return;
        const raf = window.requestAnimationFrame(() => {
            setTick((tick) => tick + 1);
        });
        const timer = window.setInterval(() => {
            setTick((tick) => tick + 1);
        }, 80);
        return () => {
            window.cancelAnimationFrame(raf);
            window.clearInterval(timer);
        };
    }, [fromId, toId]);

    if (!fromId || !toId) return null;

    const from = getTargetVirtualCenter(fromId);
    const to = getTargetVirtualCenter(toId);
    if (!from || !to) return null;

    return <TargetingArrow from={from} to={to} isValidTarget />;
};
