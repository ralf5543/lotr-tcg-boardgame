import React, { useState } from 'react';
import { FactionContext } from './FactionContext';

interface FactionProviderProps {
    children: React.ReactNode;
    currentPlayer: string;
    myPlayerId: string;
    initialFpPlayerId?: string;
}

export const FactionProvider: React.FC<FactionProviderProps> = ({
    children,
    currentPlayer,
    myPlayerId,
    initialFpPlayerId = '0',
}) => {
    const [fpPlayerId, setFpPlayerId] = useState(initialFpPlayerId);

    return (
        <FactionContext.Provider
            value={{
                currentPlayer,
                myPlayerId,
                fpPlayerId,
                setFpPlayerId,
            }}
        >
            {children}
        </FactionContext.Provider>
    );
};