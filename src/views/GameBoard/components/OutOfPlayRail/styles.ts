import styled, { keyframes, css } from 'styled-components';
import {
    appearPulseCss,
    valueChangePulseCss,
} from '../../styles/valuePulse';

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
    gap: 6px;
    justify-content: center;
    flex-shrink: 0;
`;

/** Trois piles côte à côte dans 240px : un peu plus étroites qu’avant. */
const pileBox = css`
    position: relative;
    width: 72px;
    height: 104px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding: 5px 3px;
    box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.45);
    font: inherit;
    color: inherit;
`;

export const PileBlock = styled.button<{ $variant: 'discard' | 'cemetery' }>`
    ${pileBox}
    border: 2px solid
        ${({ $variant }) =>
            $variant === 'cemetery' ? '#8b1e1e' : '#8a6a32'};
    background: ${({ $variant }) =>
        $variant === 'cemetery'
            ? 'linear-gradient(180deg, #3a1515 0%, #1a0b0b 100%)'
            : 'linear-gradient(180deg, #3d3218 0%, #1c160c 100%)'};
    pointer-events: auto;
    cursor: pointer;
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

/**
 * Pioche : face cachée, non cliquable (on ne consulte pas le contenu).
 * Compteur seul — signal de taille / moulin.
 */
export const DeckBlock = styled.div<{ $empty?: boolean; $pulseGen?: number }>`
    ${pileBox}
    border: 2px solid #3d5a7a;
    background: linear-gradient(180deg, #1a3048 0%, #0c1520 100%);
    opacity: ${({ $empty }) => ($empty ? 0.45 : 1)};
    overflow: hidden;
    pointer-events: none;
    ${({ $pulseGen }) => valueChangePulseCss($pulseGen)}
`;

export const DeckBack = styled.img`
    position: absolute;
    inset: 4px 4px 28px;
    width: calc(100% - 8px);
    height: calc(100% - 32px);
    object-fit: cover;
    border-radius: 3px;
    opacity: 0.88;
    pointer-events: none;
`;

export const PileLabel = styled.span`
    position: relative;
    z-index: 1;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #f3e6c4;
    text-align: center;
    line-height: 1.15;
    white-space: pre-line;
`;

export const RemovedBlock = styled.button`
    width: 100%;
    max-width: 228px;
    align-self: center;
    height: 40px;
    border-radius: 6px;
    border: 2px solid #5b6b7c;
    background: linear-gradient(180deg, #232b36 0%, #11161d 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 6px;
    box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.5);
    pointer-events: auto;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.15s ease;

    &:hover {
        border-color: #9fb4c8;
        box-shadow:
            inset 0 0 14px rgba(0, 0, 0, 0.5),
            0 0 10px rgba(159, 180, 200, 0.25);
        transform: translateY(-1px);
    }

    &:focus-visible {
        outline: 2px solid #9fb4c8;
        outline-offset: 2px;
    }
`;

export const ThreatDots = styled.div`
    position: absolute;
    inset: 8px 4px 30px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: center;
    gap: 0;
`;

export const ThreatDot = styled.img`
    width: 20px;
    height: 20px;
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
