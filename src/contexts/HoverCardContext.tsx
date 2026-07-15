import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { CardType } from '../game/types'; // Ajuste le chemin selon ton projet

interface HoverCardContextType {
    hoveredCard: CardType | null;
    setHoveredCard: (card: CardType | null) => void;
}

const HoverCardContext = createContext<HoverCardContextType | undefined>(undefined);

export const HoverCardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [hoveredCard, setHoveredCard] = useState<CardType | null>(null);

    return (
        <HoverCardContext.Provider value={{ hoveredCard, setHoveredCard }}>
            {children}
        </HoverCardContext.Provider>
    );
};

export const useHoverCard = () => {
    const context = useContext(HoverCardContext);
    if (!context) {
        throw new Error('useHoverCard doit être utilisé à l\'intérieur de HoverCardProvider');
    }
    return context;
};