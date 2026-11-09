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
    min-height: 120px;
    min-width: 0;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 36, 0.72);
    color: #cbd5e1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    pointer-events: auto;
`;

export const ChatTabs = styled.div`
    flex-shrink: 0;
    display: flex;
    gap: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.25);
`;

export const ChatTab = styled.button<{ $active?: boolean }>`
    flex: 1 1 0;
    appearance: none;
    margin: 0;
    padding: 6px 4px;
    border: none;
    border-bottom: 2px solid
        ${({ $active }) => ($active ? '#e2c044' : 'transparent')};
    background: ${({ $active }) =>
        $active ? 'rgba(226, 192, 68, 0.08)' : 'transparent'};
    color: ${({ $active }) => ($active ? '#f0d978' : '#94a3b8')};
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;

    &:hover {
        color: #e2e8f0;
    }
`;

export const ChatFeed = styled.div`
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 8px 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
`;

export const ChatEmpty = styled.p`
    margin: auto 0;
    padding: 8px;
    text-align: center;
    font-size: 11px;
    font-style: italic;
    color: #64748b;
`;

export const ChatEntry = styled.div<{ $kind: 'journal' | 'chat' | 'phase' }>`
    font-size: ${({ $kind }) =>
        $kind === 'phase' ? '10px' : $kind === 'journal' ? '10px' : '11px'};
    line-height: 1.35;
    color: ${({ $kind }) =>
        $kind === 'phase'
            ? '#e2c044'
            : $kind === 'journal'
              ? '#94a3b8'
              : '#e2e8f0'};
    font-style: ${({ $kind }) => ($kind === 'journal' ? 'italic' : 'normal')};
    font-weight: ${({ $kind }) => ($kind === 'phase' ? 700 : 400)};
    letter-spacing: ${({ $kind }) =>
        $kind === 'phase' ? '0.03em' : 'normal'};
    word-break: break-word;
`;

export const JournalPhaseRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0 3px 6px;
    border-left: 2px solid rgba(226, 192, 68, 0.75);
`;

export const JournalPhaseIcon = styled.img`
    width: 14px;
    height: 14px;
    object-fit: contain;
    flex-shrink: 0;
    opacity: 0.9;
`;

export const JournalPhaseLabel = styled.span`
    text-transform: uppercase;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #f0d978;
`;

export const JournalPlayRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 6px;
    font-style: normal;
    line-height: 1.35;
`;

export const JournalAvatar = styled.img`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
`;

export const JournalActor = styled.span`
    font-weight: 700;
    color: #cbd5e1;
`;

export const JournalCardLink = styled.button`
    appearance: none;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 700;
    font-style: normal;
    color: #e2c044;
    cursor: pointer;
    text-align: left;
    text-decoration: underline;
    text-decoration-color: rgba(226, 192, 68, 0.35);
    text-underline-offset: 2px;

    &:hover {
        color: #f0d978;
        text-decoration-color: rgba(240, 217, 120, 0.7);
    }
`;

export const JournalThumb = styled.img`
    height: 1.55em;
    width: auto;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    object-position: center;
    border-radius: 2px;
    flex-shrink: 0;
    background: #222;
    vertical-align: middle;
`;

export const JournalThumbSiteWrap = styled.span`
    position: relative;
    height: 1.55em;
    width: auto;
    aspect-ratio: 1.39 / 1;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 2px;
    background: #222;
    container-type: size;
`;

export const JournalThumbSite = styled.img`
    position: absolute;
    left: 50%;
    top: 50%;
    width: 100cqh;
    height: 100cqw;
    object-fit: cover;
    object-position: center;
    transform-origin: center center;
    transform: translate(-50%, -50%) rotate(90deg);
`;

export const ChatSender = styled.span<{ $mine?: boolean }>`
    display: inline;
    font-weight: 700;
    font-style: normal;
    letter-spacing: 0.02em;
    color: ${({ $mine }) => ($mine ? '#e2c044' : '#93c5fd')};
    margin-right: 4px;
`;

export const ChatForm = styled.form`
    flex-shrink: 0;
    display: flex;
    gap: 4px;
    padding: 6px;
    border-top: 1px solid rgba(148, 163, 184, 0.25);
`;

export const ChatInput = styled.input`
    flex: 1 1 0;
    min-width: 0;
    height: 28px;
    border-radius: 5px;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: rgba(15, 23, 36, 0.9);
    color: #f1f5f9;
    font: inherit;
    font-size: 11px;
    padding: 0 8px;

    &::placeholder {
        color: #64748b;
    }

    &:focus {
        outline: none;
        border-color: rgba(226, 192, 68, 0.7);
    }
`;

export const ChatSend = styled.button`
    flex-shrink: 0;
    height: 28px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid rgba(226, 192, 68, 0.55);
    background: rgba(226, 192, 68, 0.15);
    color: #f0d978;
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;

    &:disabled {
        opacity: 0.4;
        cursor: default;
    }

    &:not(:disabled):hover {
        background: rgba(226, 192, 68, 0.28);
    }
`;
