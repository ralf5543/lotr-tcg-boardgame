import styled, { keyframes, css } from 'styled-components';
import { appearPulseCss } from '../../styles/valuePulse';

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

export const PileRow = styled.div`
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-shrink: 0;
`;

export const PileBlock = styled.button<{ $variant: 'discard' | 'cemetery' }>`
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
    pointer-events: auto;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.15s ease;

    &:hover {
        border-color: #e2c044;
        box-shadow:
            inset 0 0 18px rgba(0, 0, 0, 0.45),
            0 0 10px rgba(226, 192, 68, 0.25);
        transform: translateY(-1px);
    }

    &:focus-visible {
        outline: 2px solid #e2c044;
        outline-offset: 2px;
    }
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
    inset: 10px 6px 34px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: center;
    gap: 0;
`;

export const ThreatDot = styled.img`
    width: 24px;
    height: 24px;
    object-fit: contain;
    margin: -3px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7));
    ${appearPulseCss}
`;

export const TwilightSlot = styled.div`
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const TwilightBowl = styled.div`
    height: 110px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.45);
    border: 1px solid rgba(255, 191, 0, 0.25);
    overflow: hidden;
`;

const initiativeHaloOn = keyframes`
    0% {
        box-shadow: 0 0 0 0 rgba(226, 192, 68, 0.15);
    }
    35% {
        box-shadow:
            0 0 0 5px rgba(226, 192, 68, 0.55),
            0 0 22px 6px rgba(226, 192, 68, 0.4);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(226, 192, 68, 0);
    }
`;

const initiativeHaloOff = keyframes`
    0% {
        box-shadow: 0 0 0 0 rgba(148, 163, 184, 0.12);
    }
    35% {
        box-shadow:
            0 0 0 5px rgba(148, 163, 184, 0.45),
            0 0 18px 5px rgba(148, 163, 184, 0.3);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(148, 163, 184, 0);
    }
`;

export const InitiativeChip = styled.div<{
    $mine: boolean;
    $pulse?: boolean;
}>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    border: 1px solid ${({ $mine }) => ($mine ? '#e2c044' : '#6b7280')};
    background: ${({ $mine }) =>
        $mine
            ? 'linear-gradient(90deg, rgba(50, 42, 18, 0.95) 0%, rgba(26, 37, 47, 0.85) 100%)'
            : 'linear-gradient(90deg, rgba(28, 36, 48, 0.95) 0%, rgba(18, 24, 34, 0.9) 100%)'};
    transition:
        border-color 0.25s ease,
        background 0.25s ease,
        color 0.25s ease;

    ${({ $pulse, $mine }) =>
        $pulse
            ? css`
                  animation: ${$mine ? initiativeHaloOn : initiativeHaloOff}
                      1s ease-out 1;
              `
            : ''}
`;

export const InitiativeChipLabel = styled.span<{ $mine?: boolean }>`
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${({ $mine }) =>
        $mine ? 'rgba(226, 192, 68, 0.85)' : 'rgba(156, 163, 175, 0.9)'};
`;

export const InitiativeChipHolder = styled.span<{ $mine?: boolean }>`
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: ${({ $mine }) => ($mine ? '#f0d978' : '#9ca3af')};
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
