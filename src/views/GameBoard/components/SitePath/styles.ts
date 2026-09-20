import styled, { css, keyframes } from 'styled-components';

/** Drapeau de contrôle : plongée depuis le haut-gauche, comme planté dans le site. */
const plantControlFlag = keyframes`
    from {
        opacity: 0;
        transform: translate(-22px, -34px);
    }
    to {
        opacity: 1;
        transform: translate(0, 0);
    }
`;

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
    animation: ${plantControlFlag} 0.3s cubic-bezier(0.2, 0.85, 0.3, 1) both;
`;

export const ControlFlagLabel = styled.span<{ $playerId: '0' | '1' }>`
    display: flex;
    position: absolute;
    inset-block-start: 38px;
    inset-inline-start: 43px;
    transform: rotateX(353deg) rotateY(40deg) skew(15deg, 15deg);
    transform-style: preserve-3d;
`;

/** Weather → teinte froide ; sinon or. */
export const AttachmentSeals = styled.div`
    position: absolute;
    inset-block-end: 0;
    inset-inline-start: 50%;
    translate: -50% 0;
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    max-width: calc(100% - 8px);
    pointer-events: none;
`;

export const SiteAttachmentSeal = styled.button<{
    $isWeather?: boolean;
    $abilityPhaseMatch?: boolean;
}>`
    position: relative;
    display: flex;
    align-items: center;
    gap: 3px;
    max-width: 100%;
    padding: 2px 5px 2px 2px;
    border-radius: 4px 4px 0 0;
    border: 1px solid rgba(193, 160, 84, 0.9);
    border-block-end: 0;
    background: linear-gradient(
        135deg,
        rgba(45, 38, 28, 0.95),
        rgba(26, 37, 47, 0.75)
    );
    color: ${({ $isWeather }) => ($isWeather ? '#c5dcff' : '#e2c044')};
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    cursor: ${({ $abilityPhaseMatch }) =>
        $abilityPhaseMatch ? 'pointer' : 'default'};
    pointer-events: auto;
    box-shadow: ${({ $isWeather, $abilityPhaseMatch }) =>
        $abilityPhaseMatch
            ? `0 0 6px rgba(193, 160, 84, 0.25),
               rgb(226, 192, 68) 0px 0px 10px 7px`
            : $isWeather
              ? '0 0 8px rgba(120, 180, 255, 0.35)'
              : '0 0 6px rgba(193, 160, 84, 0.25)'};

    ${({ $abilityPhaseMatch }) =>
        $abilityPhaseMatch &&
        css`
            &:active {
                box-shadow:
                    inset 0 0 8px black,
                    rgb(226, 192, 68) 0px 0px 8px 3px;
            }
        `}

    img {
        width: 10px;
        height: auto;
        flex-shrink: 0;
    }
`;

export const WeatherEmoji = styled.span`
    font-size: 10px;
    line-height: 1;
    flex-shrink: 0;
`;

export const AttachmentTitle = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 140px;
`;

export const StackedMinionsGrid = styled.div`
    position: absolute;
    inset: 20% 10% 28% 10%;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px;
    pointer-events: none;
`;

export const StackedMinionSlot = styled.div<{
    $playable?: boolean;
    $dragging?: boolean;
}>`
    position: relative;
    width: 18%;
    aspect-ratio: 2 / 3;
    flex: 0 0 auto;
    pointer-events: auto;
    overflow: visible;
    border-radius: 2px;
    opacity: ${({ $dragging }) => ($dragging ? 0 : 1)};
    cursor: ${({ $playable }) => ($playable ? 'pointer' : 'default')};
    transition:
        box-shadow 0.15s ease,
        filter 0.15s ease,
        opacity 0.1s ease;

    ${({ $playable, $dragging }) =>
        $playable &&
        !$dragging &&
        css`
            &:hover > div {
                    transform: translate(-50%, -50%) scale(0.35);
            }
        `}

    /* La carte est décorative : le slot gère hit-test / drag. */
    & > * {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(0.25);
        transform-origin: center center;
        pointer-events: none;
    }
`;
