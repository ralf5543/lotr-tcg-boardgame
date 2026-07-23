import styled from 'styled-components';

export const PickerContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const Title = styled.h4`
    margin: 0;
    color: #e2c044;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
`;

export const Grid = styled.div`
    display: flex;
    gap: 12px;
    justify-content: center;
`;

export const SiteCardItem = styled.div`
    width: 140px;
    aspect-ratio: 1.39/1;
    flex-shrink: 0;
    background-color: black;;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.2s ease;
    background-image: url(interface/cards_backgrounds/site_standard.webp);
    background-size: contain;
    background-repeat: no-repeat;
    position: relative;
    filter: drop-shadow(rgb(0, 0, 0) 0px 3px 4px);

    &:hover {
        border-color: #e2c044;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    &:active {
        cursor: grabbing;
    }
`;

export const SiteName = styled.p`
    position: absolute;
    font-size: 6px;
    font-family: 'DecipherTitle', serif;
    font-weight: bold;
    color: black;
    inset-block-start: 6px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
`;

export const SiteVisualContainer = styled.figure`
    position: absolute;
    inset: 14px 15px 26px 16px;
`;

export const SiteVisual = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
`;

export const TwilightBadge = styled.span`
    font-size: 11px;
    font-weight: bold;
    color: #e2c044;
    white-space: nowrap;
`;

export const GameText = styled.p`
    line-height: .8;
    font-size: 5px;
    color: black;
    /* text-align: right; */
    inset: 79px 17px 11px 20px;
    /* border: 1px solid red; */
    position: absolute;
`;

export const EmptyText = styled.div`
    color: #666;
    font-style: italic;
    font-size: 12px;
    text-align: center;
    padding: 10px;
`;