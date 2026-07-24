import styled, { css } from 'styled-components';

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

const isNotCharacter = (subType?: string) => 
    Boolean(subType) && subType !== 'COMPANION' && subType !== 'MINION';

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
        css `
        width: 400px;
        border-radius: 12px;

        ${CardHeader} {
            min-height: 75px;
            padding-block-start: 22px;
            padding-inline: 20px;
            line-height: 1;
        }

        ${CardTitles} {

            ${isNotCharacter(props.$subType) && css`
                    inset: 80px 325px 260px 25px;
                `}
        }

        ${CardTitle} {
            font-size: 26px;
            margin-block-end: 1px;

            ${isNotCharacter(props.$subType) && css`
                    min-height: 75px;
                `}
        }

        ${CardSubtitle} {
            font-size: 18px;
        }

        ${CardType} {
            margin-block-start: 11px;
            font-size: 20px;
            line-height: 1;

            ${isNotCharacter(props.$subType) && css`
                    inset: 315px 40px 205px 100px;
                `}
        }

        ${VisualContainer} {
            height: 240px;
            padding-inline: 42px;

            ${isNotCharacter(props.$subType) && css`
                    padding-inline: 0;
                    height: auto;
                    inset: 65px 36px 287px 83px;
                `}
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
    padding-block-start: 6px;
    padding-inline: 4px;
    line-height: 1;
`;

export const CardTitles = styled.div<{ $subType?: string }>`
    display: flex;
    flex-direction: column;
    font-family: 'DecipherTitle', serif;
    font-variant: small-caps;
    ${(props) =>
        isNotCharacter(props.$subType) &&
        css`
            position: absolute; 
            inset: 26px 109px 83px 7px;
            writing-mode: sideways-lr;
            line-height: 0.8;
            text-align: center;
        `}
`;
export const CardTitle = styled.p<{ $subType?: string }>`
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-block-start: 0.5px;
    ${(props) =>
        isNotCharacter(props.$subType) &&
        css`
            font-size: 8px;
        `}
`;
export const CardSubtitle = styled.p<{ $subType?: string }>`
    font-size: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-block-start: 0.5px;
    ${(props) =>
        isNotCharacter(props.$subType) &&
        css`
            font-size: 6px;
        `}
`;
export const CardType = styled.p<{ $subType?: string }>`
    font-family: DecipherTitle, serif;
    font-size: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-block-start: 3.5px;
    font-variant: small-caps;
    text-transform: capitalize;
    ${(props) =>
        isNotCharacter(props.$subType) &&
        css`
            position: absolute;
            inset: 101px 15px 66px 34px;
        `}
`;

export const TwilightBadge = styled.span<{ $isShadow?: boolean }>`
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
    margin-inline-end: 0px;
    text-align: center;
    font-family: LOTRIcons;
`;

export const VisualContainer = styled.figure<{ $subType?: string }>`
    height: 76px;
    margin: 0px;
    padding-inline: 13px;
    ${(props) =>
        isNotCharacter(props.$subType) &&
        css`
            height: 68px;
            margin: 0px;
            padding-inline: 0;
            position: absolute;
            inset: 20px 10px 7px 27px;
            inset-block-start: 20px;
        `}
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
