import React, { useState, useEffect } from 'react';
import { FactionContext } from './FactionContext';

interface FactionProviderProps {
    children: React.ReactNode;
    myPlayerId: string;
    fpPlayerId?: string;
    isSetupPhase?: boolean;
}

export const FactionProvider: React.FC<FactionProviderProps> = ({
    children,
    myPlayerId,
    fpPlayerId: externalFpPlayerId,
    isSetupPhase = false,
}) => {
    const [fpPlayerId, setFpPlayerId] = useState<string>(externalFpPlayerId || '0');

    // Sync si la prop externe change via G
    useEffect(() => {
        if (externalFpPlayerId !== undefined) {
            setFpPlayerId(externalFpPlayerId);
        }
    }, [externalFpPlayerId]);

    return (
        <FactionContext.Provider
            value={{
                currentPlayer: '0',
                myPlayerId,
                fpPlayerId,
                setFpPlayerId,
                isSetupPhase,
            }}
        >
            {children}
        </FactionContext.Provider>
    );
};