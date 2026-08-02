import { createContext, useContext } from 'react';

export type Faction = 'FREE_PEOPLES' | 'SHADOW';

interface FactionContextType {
    currentPlayer: string;
    myPlayerId: string;
    fpPlayerId: string;
    setFpPlayerId?: (id: string) => void;
}

export const FactionContext = createContext<FactionContextType | undefined>(undefined);

export const useFaction = () => {
    const context = useContext(FactionContext);
    if (!context) {
        throw new Error('useFaction doit être utilisé dans un FactionProvider');
    }
    return context;
};