import styled from 'styled-components';

const getSignet = (signet: string): string => {
    switch (signet) {
        case 'ARAGORN':
            return 'url(interface/signet_aragorn.webp)';
        case 'FRODO':
            return 'url(interface/signet_frodo.webp)';
        case 'GANDALF':
            return 'url(interface/signet_gandalf.webp)';
        case 'THEODEN':
            return 'url(interface/signet_theoden.webp)';
        default:
            return '';
    }
};
const getCultureBackground = (culture: string): string => {
    switch (culture) {
        case 'GONDOR':
            return 'url(interface/gondor_character.webp)';
        case 'SHIRE':
            return 'url(interface/shire_character.webp)';
        case 'ISENGARD':
            return 'url(interface/isengard_character.webp)';
        case 'WRAITH':
            return 'url(interface/ringwraith_character.webp)';
        case 'ELVEN':
            return 'url(interface/elven_character.webp)';
        case 'DWARVEN':
            return 'url(interface/dwarven_character.webp)';
        case 'MORIA':
            return 'url(interface/moria_character.webp)';
        case 'SAURON':
            return 'url(interface/sauron_character.webp)';
        default:
            return '';
    }
};

const getCultureColorGradient = (culture: string): string => {
    switch (culture) {
        case 'GONDOR':
            return 'linear-gradient(to top right, #685d9f 0%, #e4dcd9 18%, #685d9f 83%)';
        case 'SHIRE':
            return 'linear-gradient(to top right, #211f13 0%, #6c7148 18%, #211f13 83%)';
        case 'ISENGARD':
            return 'linear-gradient(to top right, #0b0b0b 0%, #3d3e42 18%, #0b0b0b 83%)';
        case 'WRAITH':
            return 'linear-gradient(to top right, #121116 0%, #6c8fa3 18%, #121116 83%)';
        case 'ELVEN':
            return 'linear-gradient(to top right, #1d4368 0%, #78a1c1 18%, #1d4368 83%)';
        case 'DWARVEN':
            return 'linear-gradient(to top right, #602517 0%, #7d6155 18%, #602517 83%)';
        case 'MORIA':
            return 'linear-gradient(to top right, #313332 0%, #b55723 18%, #313332 83%)';
        case 'SAURON':
            return 'linear-gradient(to top right, #1a1c1b 0%, #8b1a20 18%, #1a1c1b 83%)';
        default:
            return '#718096';
    }
};

const getSecondaryCultureColor = (culture: string): string => {
    switch (culture) {
        case 'GONDOR':
            return '#e4dcd9';
        case 'SHIRE':
            return '#cdcda7';
        case 'ISENGARD':
            return '#bfcdb3';
        case 'WRAITH':
            return '#cecac9';
        case 'ELVEN':
            return '#dad8d9';
        case 'DWARVEN':
            return '#e6decb';
        case 'MORIA':
            return '#e9d8bc';
        case 'SAURON':
            return '#c2bba9';
        default:
            return '#718096';
    }
};

export const CardContainer = styled.div<{
    $culture: string;
    $imageUrl?: string;
    $isShadow?: boolean;
    $isPlayable?: boolean;
    $size?: 'sm' | 'md' | 'lg'; // Ajout du prop de taille
}>`
    aspect-ratio: 1/1.39;
    width: 130px;
    background-image: ${(props) => getCultureBackground(props.$culture)};
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    display: flex;
    flex-direction: column;
    position: relative;
    color: black;
    background-color: black;
    border-radius: 4px;

    /* On gère le filtre visuel selon si la carte est jouable ou non */
    filter: ${(props) =>
        props.$isPlayable === false
            ? 'brightness(0.55) contrast(0.9) grayscale(0.15)'
            : 'brightness(1) contrast(1)'};

    transition:
        filter 0.3s ease,
        transform 0.2s ease,
        box-shadow 0.2s ease;

    /* Optionnel : si on survole une carte inactive dans sa main, on peut la rallumer légèrement */
    &:hover {
        filter: ${(props) =>
            props.$isPlayable === false
                ? 'brightness(0.8) contrast(1)'
                : 'none'};
    }
    cursor: ${(props) =>
        props.onClick && (props.$isPlayable ?? true) ? 'pointer' : 'default'};
    transition:
        transform 0.2s ease,
        opacity 0.2s ease;
    user-select: none;
    -webkit-user-drag: ${(props) => (props.draggable ? 'element' : 'none')};
    cursor: ${(props) => (props.draggable ? 'grab' : 'default')};

    &:active {
        cursor: ${(props) => (props.draggable ? 'grabbing' : 'default')};
    }

    /* ======------ Small cards ------====== */
    ${(props) =>
        props.$size === 'sm' &&
        `
        width: 150px;
        border-radius: .5em;
        border: .5em solid black;
        background-image: ${getCultureColorGradient(props.$culture)};

        ${CardTitle} {
            font-size: 2.4em;
        }

        ${KeywordText} {
            font-size: 2.4em;
        }

        ${StrengthBadge} {
            font-size: 4em;
            width: 3em;
        }

        ${VitalityBadge} {
            font-size: 4em;
            width: 2em;
        }
    `}
    /* ======------ Large cards ------====== */
    ${(props) =>
        props.$size === 'lg' &&
        `
        width: 400px;
        border-radius: 12px;

        ${CardHeader} {
            min-height: 75px;
            padding-block-start: 22px;
            padding-inline: 20px;
            line-height: 1;
        }

        ${CardTitle} {
            font-size: 26px;
            margin-block-end: 1px
        }

        ${CardSubtitle} {
            font-size: 18px;
        }

        ${CardType} {
            font-size: 20px;
            line-height: 1;
        }

        ${VisualContainer} {
            height: 240px;
            padding-inline: 42px;
        }

        ${TextContainer} {
            padding: 18px 12px;
            border: 1px solid orange;
            inset: 352px 20px 32px 86px;
        }

        ${KeywordText} {
            font-size: 18px;
        }

        ${GameText} {
            font-size: 18px;
        }

        ${TwilightBadge} {
            font-size: 28px;
            width: 50px;
            margin-inline-end: 20px;
        }

        ${StrengthBadge} {
            font-size: 28px;
            width: 86px;
            inset-block-start: 336px;
            inset-inline-start: 2px;
            background-position: 18px 4px;
        }

        ${VitalityBadge} {
            font-size: 28px;
            width: 56px;
            inset-block-start: 416px;
            inset-inline-start: 20px;
            background-position: 4px 4px;
        }

        ${CardSignet} {
            width: 56px;
            inset-block-start: 474px;
            inset-inline-start: 24px;
        }

        ${RoamingNumber} {
            font-size: 28px;
            width: 56px;
            inset-block-start: 474px;
            inset-inline-start: 20px;
        }
            
    `}
`;

export const CardHeader = styled.div`
    display: flex;
    min-height: 15px;
    padding-block-start: 6px;
    padding-inline: 6px;
    line-height: 1;
`;

export const CardTitles = styled.div`
    display: flex;
    flex-direction: column;
    font-family: 'DecipherTitle', serif;
    font-variant: small-caps;
`;
export const CardTitle = styled.p`
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-block-start: 0.5px;
}
`;
export const CardSubtitle = styled.p`
    font-size: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-block-start: 0.5px;
`;
export const CardType = styled.p`
    font-family: DecipherTitle, serif;
    font-size: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-block-start: 0.6em;
`;

export const TwilightBadge = styled.span<{ $isShadow?: boolean }>`
    /*background-image: ${(props) =>
        (props.$isShadow ?? true)
            ? 'url(interface/twilight_shadow.webp)'
            : 'url(interface/twilight_freeps.webp)'};*/
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    color: white;
    font-weight: bold;
    font-size: 12px;
    width: 20px;
    aspect-ratio: 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-inline-end: 5px;
    text-align: center;
`;

export const VisualContainer = styled.figure`
    height: 76px;
    margin: 0px;
    padding-inline: 13px;
}
`;

export const Visual = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
`;

export const TextContainer = styled.div`
    padding: 3px;
    position: absolute;
    inset: 114px 8px 10px 27px;
`;

export const KeywordText = styled.p`
    font-size: 6px;
    margin: 0;
    font-weight: bold;
`;
export const GameText = styled.p`
    font-size: 6px;
    color: black;
    overflow: hidden;
    margin-block-start: 2px;
    line-height: 1;
`;

export const StrengthBadge = styled.span`
    background-image: url('interface/icon_strength.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    color: #fff;
    font-weight: bold;
    font-size: 9px;
    width: 27px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    inset-block-start: 113px;
    inset-inline-start: 3px;
`;
export const VitalityBadge = styled.span`
    background-image: url('interface/icon_vitality.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    color: #fff;
    font-weight: bold;
    font-size: 9px;
    width: 17px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    inset-block-start: 139px;
    inset-inline-start: 9px;
`;
export const RoamingNumber = styled.span`
    background-image: url('interface/minion_site_number.webp');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    width: 17px;
    aspect-ratio: 1;
    position: absolute;
    inset-block-start: 156px;
    inset-inline-start: 8px;
    text-align: center;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
`;
export const CardSignet = styled.span<{ $signet: string }>`
    background-image: ${(props) => getSignet(props.$signet)};
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    width: 16px;
    aspect-ratio: 1;
    position: absolute;
    inset-block-start: 156px;
    inset-inline-start: 9px;
`;
