import { createContext, useContext } from 'react';

export type Faction = 'FREE_PEOPLE' | 'SHADOW';

interface FactionContextType {
    currentPlayer: string;
    myPlayerId: string;
    fpPlayerId: string;
    isSetupPhase: boolean;
    setFpPlayerId?: (id: string) => void;
}

const defaultContextValue: FactionContextType = {
    currentPlayer: '0',
    myPlayerId: '0',
    fpPlayerId: '0',
    isSetupPhase: false,
    setFpPlayerId: () => {},
};

export const FactionContext = createContext<FactionContextType | undefined>(undefined);

export const useFaction = () => {
    const context = useContext(FactionContext);
    
    if (!context) {
        return defaultContextValue;
    }
    
    return context;
};