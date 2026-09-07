import React, { useEffect, useState } from 'react';
import { useDrag } from '../../../../contexts/DragContext';
import { useLocalFaction, type Faction } from '../../../../contexts/FactionContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { usePublishTargetingArrow, useTargetingArrowSync } from './TargetingArrowSync';
import { ArrowSvg } from './styles';

const PALETTES: Record<
    Faction,
    { main: string; pale: string; glow: string; dim: string; paleDim: string }
> = {
    FREE_PEOPLE: {
        main: '#e2c044',
        pale: '#f6e7a6',
        glow: 'rgba(226, 192, 68, 0.9)',
        dim: 'rgba(226, 192, 68, 0.7)',
        paleDim: 'rgba(246, 231, 166, 0.55)',
    },
    SHADOW: {
        main: '#e23b3b',
        pale: '#ff8f6b',
        glow: 'rgba(255, 0, 0, 0.8)',
        dim: 'rgba(226, 59, 59, 0.7)',
        paleDim: 'rgba(255, 143, 107, 0.55)',
    },
};

const point = (
    origin: { x: number; y: number },
    angle: number,
    along: number,
    across: number
) => ({
    x: origin.x + along * Math.cos(angle) - across * Math.sin(angle),
    y: origin.y + along * Math.sin(angle) + across * Math.cos(angle),
});

const toPoints = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(' ');

interface TargetingArrowProps {
    from: { x: number; y: number };
    to: { x: number; y: number };
    isValidTarget: boolean;
    faction?: Faction;
}

export const TargetingArrow: React.FC<TargetingArrowProps> = ({
    from,
    to,
    isValidTarget,
    faction = 'FREE_PEOPLE',
}) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) return null;

    const midX = (from.x + to.x) / 2;
    const bend = Math.min(90, dist * 0.28);
    const controlX = midX;
    const controlY = Math.min(from.y, to.y) - bend;

    const tx = to.x - controlX;
    const ty = to.y - controlY;
    const angle = Math.atan2(ty, tx);

    const isShadow = faction === 'SHADOW';
    const headLen = isShadow ? 24 : 22;
    const headW = isShadow ? 9 : 8;
    const shaftEnd = point(to, angle, -headLen * 0.55, 0);
    const path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${shaftEnd.x} ${shaftEnd.y}`;
    const leaf = toPoints(
        isShadow
            ? [
                  point(to, angle, 0, 0),
                  point(to, angle, -headLen * 0.4, -headW),
                  point(to, angle, -headLen * 0.55, -headW * 0.35),
                  point(to, angle, -headLen, 0),
                  point(to, angle, -headLen * 0.55, headW * 0.35),
                  point(to, angle, -headLen * 0.4, headW),
              ]
            : [
                  point(to, angle, 0, 0),
                  point(to, angle, -headLen * 0.55, -headW),
                  point(to, angle, -headLen, 0),
                  point(to, angle, -headLen * 0.55, headW),
              ]
    );
    const leafCore = toPoints([
        point(to, angle, -1, 0),
        point(to, angle, -headLen * 0.5, -headW * 0.32),
        point(to, angle, -headLen * 0.82, 0),
        point(to, angle, -headLen * 0.5, headW * 0.32),
    ]);

    const palette = PALETTES[faction];
    const ink = isValidTarget ? palette.main : palette.dim;
    const pale = isValidTarget ? palette.pale : palette.paleDim;
    const width = isValidTarget ? 4.5 : 3;

    return (
        <ArrowSvg width="1920" height="1080" viewBox="0 0 1920 1080">
            <path
                d={path}
                fill="none"
                stroke={palette.main}
                strokeWidth={width + 8}
                strokeLinecap="round"
                opacity={isValidTarget ? 0.22 : 0.1}
            />
            <path
                d={path}
                fill="none"
                stroke={ink}
                strokeWidth={width}
                strokeLinecap="round"
                style={{
                    filter: isValidTarget
                        ? `drop-shadow(0 0 6px ${palette.glow})`
                        : 'none',
                }}
            />
            <path
                d={path}
                fill="none"
                stroke={pale}
                strokeWidth={1.4}
                strokeLinecap="round"
                opacity={0.9}
            />
            <circle cx={from.x} cy={from.y} r={5} fill={ink} />
            <circle cx={from.x} cy={from.y} r={2.2} fill={pale} />
            <polygon points={leaf} fill={ink} />
            <polygon points={leafCore} fill={pale} opacity={0.85} />
        </ArrowSvg>
    );
};

export const BoardTargetingArrow: React.FC = () => {
    const {
        targetingKind,
        arrowFromCardId,
        targetableCardIds,
        selectCard,
        stopTargeting,
        setHoveredTargetId,
    } = useTargeting();
    const faction = useLocalFaction();
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

    useEffect(() => {
        setHoveredTargetId(activeHoverId);
    }, [activeHoverId, setHoveredTargetId]);

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
            faction={faction}
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

    return (
        <TargetingArrow
            from={from}
            to={to}
            isValidTarget
            faction={
                sync?.remote?.faction === 'SHADOW' ? 'SHADOW' : 'FREE_PEOPLE'
            }
        />
    );
};
