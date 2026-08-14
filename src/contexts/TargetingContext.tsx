import React, { createContext, useContext, useState, useCallback } from 'react';

interface TargetingRequest {
    targetableCardIds: string[];
    onSelectTarget: (cardId: string) => void;
    message?: string;
}

interface TargetingContextType {
    isTargetingActive: boolean;
    targetableCardIds: string[];
    startTargeting: (request: TargetingRequest) => void;
    stopTargeting: () => void;
    isCardTargetable: (cardId: string) => boolean;
    selectCard: (cardId: string) => void;
    message?: string;
}

const TargetingContext = createContext<TargetingContextType | null>(null);

export const TargetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [request, setRequest] = useState<TargetingRequest | null>(null);

    const startTargeting = useCallback((req: TargetingRequest) => {
        setRequest(req);
    }, []);

    const stopTargeting = useCallback(() => {
        setRequest(null);
    }, []);

    const isCardTargetable = useCallback(
        (cardId: string) => {
            return request?.targetableCardIds.includes(cardId) ?? false;
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
                targetableCardIds: request?.targetableCardIds || [],
                startTargeting,
                stopTargeting,
                isCardTargetable,
                selectCard,
                message: request?.message,
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