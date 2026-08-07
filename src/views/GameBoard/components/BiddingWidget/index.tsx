import React, { useState } from 'react';
import styled from 'styled-components';

interface BiddingWidgetProps {
    currentBid: number | null;
    onSubmitBid: (amount: number) => void;
    isWaitingForOpponent: boolean;
}

export const BiddingWidget: React.FC<BiddingWidgetProps> = ({
    currentBid,
    onSubmitBid,
    isWaitingForOpponent,
}) => {
    const [selectedBid, setSelectedBid] = useState<number>(0);

    if (isWaitingForOpponent) {
        return (
            <WaitingState>
                Mise enregistrée : <strong>{currentBid} fardeau{currentBid! > 1 ? 'x' : ''}</strong>. En attente de l'adversaire...
            </WaitingState>
        );
    }

    return (
        <WidgetBox>
            <ControlsGroup>
                <StepButton
                    disabled={selectedBid <= 0}
                    onClick={() => setSelectedBid((prev) => Math.max(0, prev - 1))}
                >
                    -
                </StepButton>
                <BidDisplay>{selectedBid}</BidDisplay>
                <StepButton
                    disabled={selectedBid >= 10}
                    onClick={() => setSelectedBid((prev) => Math.min(10, prev + 1))}
                >
                    +
                </StepButton>
            </ControlsGroup>

            <SubmitButton onClick={() => onSubmitBid(selectedBid)}>
                Miser {selectedBid} fardeau{selectedBid > 1 ? 'x' : ''}
            </SubmitButton>
        </WidgetBox>
    );
};

const WidgetBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
`;

const ControlsGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const StepButton = styled.button`
    background: #2a2a32;
    border: 1px solid #c8a050;
    color: #c8a050;
    width: 36px;
    height: 36px;
    border-radius: 4px;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;

    &:hover:not(:disabled) {
        background: #c8a050;
        color: #14141a;
    }

    &:disabled {
        border-color: #444;
        color: #444;
        cursor: not-allowed;
    }
`;

const BidDisplay = styled.span`
    font-size: 1.5rem;
    font-weight: bold;
    color: #fff;
    min-width: 30px;
    text-align: center;
`;

const SubmitButton = styled.button`
    background: #c8a050;
    color: #14141a;
    border: none;
    padding: 0.4rem 1.2rem;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
    font-size: 0.85rem;

    &:hover {
        background: #e0b868;
    }
`;

const WaitingState = styled.div`
    font-size: 0.9rem;
    color: #c8a050;
    font-style: italic;
`;