import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CardState } from '../game/types';

type TargetingKind =
    | 'ARCHERY'
    | 'THREAT_WOUND'
    | 'SKIRMISH_SELECT'
    | 'DESIGNATION'
    | 'HAND_DISCARD'
    | 'SITE_REPLACE'
    | 'SITE_REPLACE_PATH'
    | 'SITE_ATTACH'
    | 'SANCTUARY_HEAL';

interface TargetingRequest {
    targetableCardIds: string[];
    onSelectTarget: (cardId: string) => void;
    message?: string;
    kind?: TargetingKind;
    pendingCard?: CardState;
    arrowFromCardId?: string;
    upTo?: boolean;
    selectedCardIds?: string[];
    onConfirm?: () => void;
    confirmLabel?: string;
}

interface TargetingContextType {
    isTargetingActive: boolean;
    targetingKind?: TargetingKind;
    targetableCardIds: string[];
    pendingCard?: CardState;
    arrowFromCardId?: string;
    hoveredTargetId: string | null;
    startTargeting: (request: TargetingRequest) => void;
    stopTargeting: () => void;
    isCardTargetable: (cardId: string) => boolean;
    selectCard: (cardId: string) => void;
    setHoveredTargetId: (cardId: string | null) => void;
    message?: string;
    upTo?: boolean;
    selectedCardIds: string[];
    onConfirm?: () => void;
    confirmLabel?: string;
    /** Demande une validation (Hand anime la défausse puis appelle onConfirm). */
    requestConfirm: () => void;
    /** Incrémenté à chaque requestConfirm — Hand écoute pour animer. */
    confirmNonce: number;
}

const TargetingContext = createContext<TargetingContextType | null>(null);

export const TargetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [request, setRequest] = useState<TargetingRequest | null>(null);
    const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
    const [confirmNonce, setConfirmNonce] = useState(0);

    const startTargeting = useCallback((req: TargetingRequest) => {
        setHoveredTargetId(null);
        setRequest(req);
    }, []);

    const stopTargeting = useCallback(() => {
        setHoveredTargetId(null);
        setRequest(null);
    }, []);

    const requestConfirm = useCallback(() => {
        setConfirmNonce((n) => n + 1);
    }, []);

    const isCardTargetable = useCallback(
        (cardId: string) => {
            if (!request || !cardId) return false;
            return request.targetableCardIds.includes(cardId);
        },
        [request]
    );

    const selectCard = useCallback(
        (cardId: string) => {
            if (request && isCardTargetable(cardId)) {
                request.onSelectTarget(cardId);
            }
        },
        [request, isCardTargetable]
    );

    return (
        <TargetingContext.Provider
            value={{
                isTargetingActive: Boolean(request),
                targetingKind: request?.kind,
                targetableCardIds: request?.targetableCardIds || [],
                startTargeting,
                stopTargeting,
                isCardTargetable,
                selectCard,
                message: request?.message,
                pendingCard: request?.pendingCard,
                arrowFromCardId: request?.arrowFromCardId,
                hoveredTargetId,
                setHoveredTargetId,
                upTo: request?.upTo,
                selectedCardIds: request?.selectedCardIds || [],
                onConfirm: request?.onConfirm,
                confirmLabel: request?.confirmLabel,
                requestConfirm,
                confirmNonce,
            }}
        >
            {children}
        </TargetingContext.Provider>
    );
};

export const useTargeting = () => {
    const ctx = useContext(TargetingContext);
    if (!ctx) throw new Error('useTargeting must be used within TargetingProvider');
    return ctx;
};