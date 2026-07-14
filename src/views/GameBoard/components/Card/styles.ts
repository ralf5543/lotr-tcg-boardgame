import styled from 'styled-components';

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
    /* --- TAILLE UNIQUE PILOTÉE PAR LA TAILLE DE POLICE --- */
    ${props => {
        if (props.$size === 'sm') {
            return `
                width: 70px;
                font-size: 5.5px;
            `;
        }
        if (props.$size === 'lg') {
            return `
                width: 280px;
                font-size: 22px;
            `;
        }
        // Version 'md' (par défaut, ta taille d'origine de 100px)
        return `
            width: 100px;
            font-size: 8px;
        `;
    }}
    
    aspect-ratio: 1/1.4;
    background-image: ${props => getCultureColorGradient(props.$culture)};
    background-size: cover;
    background-position: center;
    border-radius: .5em;
    border: .5em solid black;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 0.5em 0.75em rgba(0, 0, 0, 0.4);
    overflow: hidden;
    box-sizing: border-box;

    opacity: ${(props) => ((props.$isPlayable ?? true) ? 1 : 0.6)};
    cursor: ${(props) =>
        props.onClick && (props.$isPlayable ?? true) ? 'pointer' : 'default'};
    transition:
        transform 0.2s ease,
        opacity 0.2s ease;
`;

export const CardHeader = styled.div`
    background: rgba(0, 0, 0, 0.7);
    padding: 0.4em 0.6em;
    display: flex;
    min-height: 1.8em;
`;

export const CardTitles = styled.div`
    display: flex;
    flex-direction: column;
    font-family: 'DecipherTitle', serif;
    font-variant: small-caps;
`;
export const CardTitle = styled.p`
    font-size: 1em;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;
export const CardSubtitle = styled.p`
    font-size: 0.75em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;
export const Type = styled.p`
    font-family: DecipherTitle, serif;
    font-size: 0.6em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-block-start: 0.6em;
`;

export const TwilightBadge = styled.span`
    background-image: url('interface/twilight_freeps.webp');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: 0.1em 0.1em;
    color: white;
    font-weight: bold;
    font-size: 1.1em;
    width: 2em;
    aspect-ratio: 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

export const VisualContainer = styled.figure`
    height: 45%;
    margin: 0;
    padding-inline: 0.4em;
    box-sizing: border-box;
`;

export const Visual = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const GameText = styled.div<{
    $culture: string;
}>`
    margin: 0.4em;
    padding: 0.4em;
    background-color: ${props => getSecondaryCultureColor(props.$culture)};
    color: black;
    flex: 1;
    overflow: hidden;
    box-sizing: border-box;
    
    & p {
        font-family: 'EB Garamond', serif;
        font-size: 0.65em; /* Remplace les 4px figés. À 0.75em, c'est nickel */
        line-height: 1.2;
        margin: 0;
    }
`;

export const StatsRow = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding-inline: 0.4em;
    margin-block-end: 0.4em;
    box-sizing: border-box;
    position: absolute;
    bottom: 0;
    left: 0;
`;

export const StrengthBadge = styled.span`
    background-image: url('interface/icon_strength.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    color: #fff;
    font-weight: bold;
    font-size: 1.1em;
    width: 3em;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
`;
export const VitalityBadge = styled.span`
    background-image: url('interface/icon_vitality.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    color: #fff;
    font-weight: bold;
    font-size: 1.1em;
    width: 2em;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
`;