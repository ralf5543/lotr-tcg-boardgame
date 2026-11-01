import type { Ability, AbilityEffect, CardCulture } from '../../../types';
import type { CardException } from '../types';

/** Cultures jouables (sauf Gandalf) pour le choix « one culture ». */
const CULTURES: CardCulture[] = [
    'SHIRE',
    'GONDOR',
    'ROHAN',
    'ELVEN',
    'DWARVEN',
    'GOLLUM',
];

const CULTURE_LABEL_FR: Record<string, string> = {
    SHIRE: 'Comté',
    GONDOR: 'Gondor',
    ROHAN: 'Rohan',
    ELVEN: 'Elfe',
    DWARVEN: 'Nain',
    GOLLUM: 'Gollum',
};

function buffForCulture(culture: CardCulture): AbilityEffect {
    return {
        type: 'ADD_TEMP_STAT',
        stat: 'STRENGTH',
        value: 3,
        target: [[culture, 'UNBOUND', 'COMPANION']],
        all: true,
        expiresAtPhase: 'REGROUP',
    };
}

const ability: Ability = {
    id: '7R43:exception:beacons',
    phases: ['MANEUVER'],
    cost: [
        {
            exert: [
                {
                    count: 3,
                    countIfInitiative: 2,
                    target: [['Gandalf']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [
        {
            type: 'CHOOSE_ONE',
            title: 'CHOIX DE CULTURE',
            message:
                'Choisissez une culture : tous les compagnons dissociés de cette culture (sauf Gandalf) ont force +3 jusqu’au regroupement.',
            options: CULTURES.map((culture) => ({
                label: CULTURE_LABEL_FR[culture] || culture,
                effects: [buffForCulture(culture)],
            })),
        },
    ],
    source: 'SELF',
    text: 'MANEUVER: Exert Gandalf three times (or twice if you have initiative) to make all unbound companions of one culture (except gandalf) strength +3 until the regroup phase.',
    textFr:
        'Manœuvre : Affaiblir Gandalf 3 fois (ou 2 si initiative) pour donner force +3 jusqu’au regroupement à tous les compagnons dissociés d’une culture (sauf Gandalf).',
};

/** Light the Beacons — choix de culture + coût exert variable (initiative). */
export const exception7R43: CardException = {
    cardId: '7R43',
    abilities: [ability],
};
