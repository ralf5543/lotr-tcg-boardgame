import React from 'react';
import { FactionContext, type FactionType } from './FactionContext';

interface FactionProviderProps {
    children: React.ReactNode;
    currentPlayer: string;
    myPlayerId: string; // "0", "1", "2" etc.
}

export const FactionProvider: React.FC<FactionProviderProps> = ({
    children,
    currentPlayer,
    myPlayerId,
}) => {
    // Joueur '1' = Ombre, '0' = Peuples Libres (ajustable plus tard via salon/lobby)
    const playerFaction: FactionType = myPlayerId === '1' ? 'SHADOW' : 'FREE_PEOPLES';
    
    // Est-ce le tour du joueur connecté ?
    const isMyTurn = currentPlayer === myPlayerId;

    return (
        <FactionContext.Provider value={{ playerFaction, isMyTurn }}>
            {children}
        </FactionContext.Provider>
    );
};