import styled, { css } from 'styled-components';

export const SitespathContainer = styled.section`
    position: absolute;
    inset-block-start: 75px;
    inset-block-end: 50px;
    inset-inline-start: 20px;
    padding: 12px;
    background: rgba(26, 37, 47, 0.5);
    border-radius: 8px;
    width: 300px;
`;

export const Title = styled.h3`
    margin: 0 0 8px 0;
    color: #e2c044;
    font-size: 14px;
    text-transform: uppercase;
`;

export const SitesGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
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
    background: ${({ $index }) => $index === 2 || $index === 5 ? 'white' : 'black'};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 6px;
    transition: all 0.15s ease-in-out;

    /* Surbrillance lors du drag d'un site sur la zone valide */
    ${({ $isHovered }) => $isHovered && css`
        border: 2px solid #e2c044;
        box-shadow: 0 0 16px rgba(226, 192, 68, 0.8), inset 0 0 8px rgba(226, 192, 68, 0.3);
        transform: scale(1.04);
    `}
`;

export const EmptySlotContent = styled.div<{ $isNextEmpty: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    opacity: ${({ $isNextEmpty }) => ($isNextEmpty ? 1 : 0.4)};
    pointer-events: none;
`;

export const SlotTitle = styled.span`
    font-size: 12px;
    font-weight: bold;
`;

export const SlotStatus = styled.small<{ $isNextEmpty: boolean; $isHovered?: boolean }>`
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
    background: ${({ $playerId }) => ($playerId === '0' ? '#388bfd' : '#a371f7')};
    border: 2px solid #fff;
    font-size: 10px;
    font-weight: bold;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
`;