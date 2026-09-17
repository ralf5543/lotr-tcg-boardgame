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

    &::before, &::after {
        content: '';
        position: absolute;    
        inset-inline-start: 50%;
        width: 100%;
        height: 40px;
        background-size: 200px;
        background-repeat: no-repeat;
        background-position: center;
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


`;

export const SiteCardContainer = styled.div<{
    $isCurrent: boolean;
    $hasSite: boolean;
    $isHovered?: boolean;
    $index: number;
}>`
    position: relative;
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
