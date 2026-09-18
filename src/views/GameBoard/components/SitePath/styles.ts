import styled, { css } from 'styled-components';

export const SitespathContainer = styled.section`
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    position: absolute;
    inset-block: 20px;
    inset-inline-start: 20px;
    background: rgba(26, 37, 47, 0.5);
    border-radius: 8px;
    width: 300px;
    overflow: visible;

    &::before, &::after {
        content: '';
        position: absolute;    
        inset-inline-start: 50%;
        width: 100%;
        height: 40px;
        background-size: 200px;
        background-repeat: no-repeat;
        background-position: center;
        filter: drop-shadow(2px 4px 6px black);
    }

    &::before {
        inset-block-start: calc(100% / 3);
        translate: -50% -50%;
        background-image: url('interface/UI/liseret_FP.webp');
    }

    &::after {
        inset-block-start: calc((100% / 3) * 2);
        translate: -50% -50%;
        background-image: url('interface/UI/liseret_shadow.webp');
    }
`;


/** Sites 1–3 / 4–6 / 7–9 — crochet CSS via `$region` ou `[data-region]`. */
export const RegionGroup = styled.div<{ $region: 1 | 2 | 3 }>`
    display: flex;
    flex-direction: column;
    padding: 20px;
    gap: 20px;
    overflow: visible;
`;

export const SiteCardContainer = styled.div<{
    $isCurrent: boolean;
    $hasSite: boolean;
    $isHovered?: boolean;
    $index: number;
    $isMine?: boolean;
    $pathReplaceTargetable?: boolean;
    $pathReplaceDimmed?: boolean;
}>`
    position: relative;
    overflow: visible;
    width: 100%;
    aspect-ratio: 3 / 1;
    border-radius: 6px;
    background: ${({ $index }) =>
        $index === 2 || $index === 5 ? 'white' : 'black'};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 6px;
    transition: all 0.15s ease-in-out;
    cursor: ${({ $pathReplaceTargetable }) =>
        $pathReplaceTargetable ? 'pointer' : 'default'};
    opacity: ${({ $pathReplaceDimmed }) => ($pathReplaceDimmed ? 0.35 : 1)};

    ${({ $pathReplaceTargetable }) =>
        $pathReplaceTargetable &&
        css`
            outline: 2px solid rgba(255, 220, 120, 0.9);
            outline-offset: 2px;
        `}

    ${({ $isMine }) => 
        $isMine &&
        css`
            translate: -15px 0;
        `
    }
    ${({ $isMine }) =>
        $isMine === false &&
        css`
          translate: 15px 0;
        `}

    ${({ $isHovered }) =>
        $isHovered &&
        css`
            border: 2px solid #e2c044;
            box-shadow:
                0 0 16px rgba(226, 192, 68, 0.8),
                inset 0 0 8px rgba(226, 192, 68, 0.3);
            transform: scale(1.04);
        `}
`;

export const EmptySlotContent = styled.div<{ $isNextEmpty: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    pointer-events: none;
    background-color: rgb(26, 37, 47);
    border-radius: 4px;
`;

export const SlotTitle = styled.span`
    font-size: 12px;
    font-weight: bold;
`;

export const SlotStatus = styled.small<{
    $isNextEmpty: boolean;
    $isHovered?: boolean;
}>`
    font-size: 10px;
    color: ${({ $isNextEmpty }) => ($isNextEmpty ? '#e2c044' : '#888')};
    font-weight: ${({ $isHovered }) => ($isHovered ? 'bold' : 'normal')};
`;

export const RegionBonus = styled.span`
    font-size: 9px;
    color: #aaa;
    margin-top: 2px;
`;

export const SiteToken = styled.span<{ $playerId?: string }>`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ $playerId }) =>
        $playerId === '0' ? '#388bfd' : '#a371f7'};
    border: 2px solid #fff;
    font-size: 10px;
    font-weight: bold;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const ControlFlag = styled.div<{ $playerId: '0' | '1' }>`
    position: absolute;
    inset-block-start: -39px;
    inset-inline-start: -17px;
    z-index: 4;
    width: 100px;
    height: 100px;
    background-image: url('interface/UI/flag_control.webp');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    perspective: 126px;
`;

export const ControlFlagLabel = styled.span<{ $playerId: '0' | '1' }>`
    display: flex;
    position: absolute;
    inset-block-start: 38px;
    inset-inline-start: 43px;
    transform: rotateX(353deg) rotateY(40deg) skew(15deg, 15deg);
    transform-style: preserve-3d;
`;

/** Weather → Climat ; sinon → Effet. */
export const SiteAttachmentSeal = styled.button<{ $isWeather?: boolean }>`
    position: absolute;
    inset-block-end: 0;
    inset-inline-start: 50%;
    translate: -50% 0;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 3px;
    max-width: calc(100% - 8px);
    padding: 2px 5px 2px 2px;
    border-radius: 4px;
    border: 1px solid
        ${({ $isWeather }) =>
            $isWeather
                ? 'rgba(160, 200, 255, 0.95)'
                : 'rgba(193, 160, 84, 0.9)'};
    background: ${({ $isWeather }) =>
        $isWeather
            ? 'linear-gradient(135deg, rgba(30, 55, 90, 0.95), rgba(18, 32, 55, 0.95))'
            : 'linear-gradient(135deg, rgba(45, 38, 28, 0.95), rgba(26, 37, 47, 0.95))'};
    color: ${({ $isWeather }) => ($isWeather ? '#c5dcff' : '#e2c044')};
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: default;
    pointer-events: auto;
    box-shadow: ${({ $isWeather }) =>
        $isWeather
            ? '0 0 8px rgba(120, 180, 255, 0.35)'
            : '0 0 6px rgba(193, 160, 84, 0.25)'};

    img {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        flex-shrink: 0;
    }
`;

export const StackedMinionsGrid = styled.div`
    position: absolute;
    inset: 20% 10% 28% 10%;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2px;
    pointer-events: none;
`;

export const StackedMinionSlot = styled.div`
    position: relative;
    width: 16%;
    flex: 0 0 auto;
    pointer-events: auto;
    overflow: visible;

    & > * {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(0.25);
        transform-origin: center center;
    }
`;
