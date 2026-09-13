import styled from 'styled-components';

export const Rail = styled.aside`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 240px;
    width: 240px;
    min-height: 0;
    padding: 10px 8px 12px;
    background: rgba(26, 37, 47, 0.5);
    border: 1px dashed rgba(226, 192, 68, 0.55);
    border-radius: 10px;
    pointer-events: none;
`;

export const RailTitle = styled.p`
    margin: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #e2c044;
    text-align: center;
`;

export const PileRow = styled.div`
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-shrink: 0;
`;

export const PileBlock = styled.div<{ $variant: 'discard' | 'cemetery' }>`
    position: relative;
    width: 92px;
    height: 128px;
    border-radius: 6px;
    border: 2px solid
        ${({ $variant }) =>
            $variant === 'cemetery' ? '#8b1e1e' : '#8a6a32'};
    background: ${({ $variant }) =>
        $variant === 'cemetery'
            ? 'linear-gradient(180deg, #3a1515 0%, #1a0b0b 100%)'
            : 'linear-gradient(180deg, #3d3218 0%, #1c160c 100%)'};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 6px 4px;
    box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.45);
`;

export const PileLabel = styled.span`
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #f3e6c4;
    text-align: center;
    line-height: 1.2;
    white-space: pre-line;
`;

export const ThreatDots = styled.div`
    position: absolute;
    inset: 10px 8px auto;
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
`;

export const ThreatDot = styled.img`
    width: 22px;
    height: 22px;
    object-fit: contain;
`;

export const TwilightSlot = styled.div`
    flex: 0 0 auto;
    height: 110px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.45);
    border: 1px solid rgba(255, 191, 0, 0.25);
    overflow: hidden;
`;

export const ChatSlot = styled.div`
    flex: 1 1 0;
    min-height: 72px;
    border-radius: 8px;
    border: 1px dashed rgba(148, 163, 184, 0.55);
    background: rgba(30, 41, 59, 0.55);
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 12px;
    font-style: italic;
    padding: 8px;
`;
