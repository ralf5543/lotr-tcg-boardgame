import styled from 'styled-components';

const getSignet = (signet: string): string => {
    switch (signet) {
        case 'ARAGORN':
            return 'url(interface/icons/signet_aragorn.webp)';
        case 'FRODO':
            return 'url(interface/icons/signet_frodo.webp)';
        case 'GANDALF':
            return 'url(interface/icons/signet_gandalf.webp)';
        case 'THEODEN':
            return 'url(interface/icons/signet_theoden.webp)';
        default:
            return '';
    }
};
const getCultureBackground = (culture: string, subType: string, kind: string) => {
    if (culture === 'GONDOR') {
        if (subType === 'COMPANION') {
            return 'url(interface/cards_backgrounds/gondor_character.webp)';
        } else return 'url(interface/cards_backgrounds/gondor_modifier.webp)';
    }
    if (culture === 'SHIRE') {
        if (subType === 'COMPANION') {
            return 'url(interface/cards_backgrounds/shire_character.webp)';
        } else return 'url(interface/cards_backgrounds/shire_modifier.webp)';
    }
    if (culture === 'ELVEN') {
        if (subType === 'COMPANION') {
            return 'url(interface/cards_backgrounds/elven_character.webp)';
        } else return 'url(interface/cards_backgrounds/elven_modifier.webp)';
    }
    if (culture === 'DWARVEN') {
        if (subType === 'COMPANION') {
            return 'url(interface/cards_backgrounds/dwarven_character.webp)';
        } else return 'url(interface/cards_backgrounds/dwarven_modifier.webp)';
    }
    if (culture === 'GANDALF') {
        if (subType === 'COMPANION') {
            return 'url(interface/cards_backgrounds/gandalf_character.webp)';
        } else return 'url(interface/cards_backgrounds/gandalf_modifier.webp)';
    }
    if (culture === 'ROHAN') {
        if (subType === 'COMPANION') {
            return 'url(interface/cards_backgrounds/rohan_character.webp)';
        } else return 'url(interface/cards_backgrounds/rohan_modifier.webp)';
    }
    if (culture === 'GOLLUM') {
        if (subType === 'COMPANION') {
            return 'url(interface/cards_backgrounds/gollum_freeps_character.webp)';
        } else if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/gollum_shadow_character.webp)';
        } else if (kind === 'FREE_PEOPLES') {
            return 'url(interface/cards_backgrounds/gollum_freeps_modifier.webp)';
        } else return 'url(interface/cards_backgrounds/gollum_shadow_modifier.webp)';
    }
    if (culture === 'MORIA') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/moria_character.webp)';
        } else return 'url(interface/cards_backgrounds/moria_modifier.webp)';
    }
    if (culture === 'ISENGARD') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/isengard_character.webp)';
        } else return 'url(interface/cards_backgrounds/isengard_modifier.webp)';
    }
    if (culture === 'SAURON') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/sauron_character.webp)';
        } else return 'url(interface/cards_backgrounds/sauron_modifier.webp)';
    }
    if (culture === 'RINGWRAITH') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/ringwraith_character.webp)';
        } else return 'url(interface/cards_backgrounds/ringwraith_modifier.webp)';
    }
    if (culture === 'DUNLAND') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/dunland_character.webp)';
        } else return 'url(interface/cards_backgrounds/dunland_modifier.webp)';
    }
    if (culture === 'ORC') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/orc_character.webp)';
        } else return 'url(interface/cards_backgrounds/orc_modifier.webp)';
    }
    if (culture === 'URUK-HAI') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/uruk_character.webp)';
        } else return 'url(interface/cards_backgrounds/uruk_modifier.webp)';
    }
    if (culture === 'MEN') {
        if (subType === 'MINION') {
            return 'url(interface/cards_backgrounds/men_character.webp)';
        } else return 'url(interface/cards_backgrounds/men_modifier.webp)';
    }
};
const getCultureSmallBackground = (culture: string): string => {
    switch (culture) {
        case 'GONDOR':
            return 'url(interface/cultures_backgrounds/background_gondor.webp)';
        case 'SHIRE':
            return 'url(interface/cultures_backgrounds/background_shire.webp)';
        case 'ISENGARD':
            return 'url(interface/cultures_backgrounds/background_isengard.webp)';
        case 'RINGWRAITH':
            return 'url(interface/cultures_backgrounds/background_wraith.webp)';
        case 'ELVEN':
            return 'url(interface/cultures_backgrounds/background_elf.webp)';
        case 'DWARVEN':
            return 'url(interface/cultures_backgrounds/background_dwarf.webp)';
        case 'MORIA':
            return 'url(interface/cultures_backgrounds/background_moria.webp)';
        case 'SAURON':
            return 'url(interface/cultures_backgrounds/background_sauron.webp)';
        default:
            return '';
    }
};
const getCultureWatermark = (culture: string): string => {
    switch (culture) {
        case 'GONDOR':
            return 'url(interface/watermark_gondor.png)';
        case 'SHIRE':
            return 'url(interface/watermark_gondor.png)';
        case 'ISENGARD':
            return 'url(interface/watermark_gondor.png)';
        case 'RINGWRAITH':
            return 'url(interface/watermark_gondor.png)';
        case 'ELVEN':
            return 'url(interface/watermark_gondor.png)';
        case 'DWARVEN':
            return 'url(interface/watermark_gondor.png)';
        case 'MORIA':
            return 'url(interface/watermark_gondor.png)';
        case 'SAURON':
            return 'url(interface/watermark_gondor.png)';
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
        case 'RINGWRAITH':
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
        case 'RINGWRAITH':
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
    $subType: string;
    $isShadow?: boolean;
    $isPlayable?: boolean;
    $kind: string;
    $size?: 'sm' | 'md' | 'lg';
}>`
    aspect-ratio: 1/1.39;
    width: 130px;
    background-image: ${(props) => getCultureBackground(props.$culture, props.$subType, props.$kind)};
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

    transition:
        transform 0.2s ease,
        opacity 0.2s ease;
    user-select: none;
    -webkit-user-drag: ${(props) => (props.draggable ? 'element' : 'none')};

    /* ======------ Small cards ------====== */
    ${(props) =>
        props.$size === 'sm' &&
        `
        width: 105px;
        border-radius: 8px 8px 49px 49px;
        border: 6px solid black;
        background-image: ${getCultureSmallBackground(props.$culture)};
        background-size: auto;
        background-repeat: repeat;
        filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1));


        ${CardHeader} {
            min-height: 18px;
            padding-block-start: 0;
            padding-inline: 0;
            line-height: 1;
            background-color: rgba(0, 0, 0, 0.5);
            position: absolute;
            width: 100%;
            display: flex;
            align-items: center;
            padding-inline: 7px;
        }

        ${CardTitle} {
            font-size: 13px;
            margin-block-end: 1px;
            color: white;
        }

        ${CardType} {
            font-size: 14px;
            line-height: 1;
        }

        ${VisualContainer} {
            height: 70px;
            padding-inline: 0;
        }

        ${TextContainer} {
            inset: 81px 4px 22px;
            background-image: ${getCultureWatermark(props.$culture)};
        }

        ${KeywordText} {
            font-size: 13px;
        }

        ${GameText} {
            font-size: 13px;
        }

        ${TwilightBadge} {
            font-size: 20px;
            width: 35px;
            margin-inline-end: 14px;
        }

        ${StrengthBadge} {
            font-size: 20px;
            width: 70px;
            inset-block-start: 88px;
            inset-inline-start: -34px;
            background-position: 13px 3px;
        }

        ${VitalityBadge} {
            font-size: 20px;
            width: 44px;
            inset-block-start: 100px;
            inset-inline-start: 67px;
            background-position: 3px 3px;
        }

        ${CardSignet} {
            width: 39px;
            inset-block-start: 116px;
            inset-inline-start: 50%;
            transform: translateX(-50%);
        }

        ${RoamingNumber} {
            font-size: 20px;
            width: 39px;
            inset-block-start: 332px;
            inset-inline-start: 14px;
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
            inset: 352px 20px 32px 86px;
        }

        ${KeywordText} {
            font-size: 18px;
        }

        ${GameText} {
            font-size: 16px;
        }

        ${LoreText} {
            font-size: 16px;
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
    padding-block-start: 5px;
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
            ? 'url(interface/icons/twilight_shadow.webp)'
            : 'url(interface/icons/twilight_freeps.webp)'};*/
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
    font-family: LOTRIcons;
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
export const LoreText = styled.p`
    font-size: 6px;
    color: black;
    overflow: hidden;
    margin-block-start: 2px;
    line-height: 1;
    font-family: DecipherLore;
`;

export const StrengthBadge = styled.span`
    background-image: url('interface/icons/icon_strength.png');
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
    font-family: LOTRIcons;
`;
export const VitalityBadge = styled.span`
    background-image: url('interface/icons/icon_vitality.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: 1px center;
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
    inset-inline-start: 8px;
    font-family: LOTRIcons;
`;
export const RoamingNumber = styled.span`
    background-image: url('interface/icons/minion_site_number.webp');
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
    font-family: LOTRIcons;
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
