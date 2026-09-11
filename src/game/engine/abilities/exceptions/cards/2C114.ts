import type { CardException } from '../types';

/** Sam — Proper Poet : si Frodon meurt, Sam devient Porteur (résistance 5). */
export const exception2C114: CardException = {
    cardId: '2C114',
    abilities: [
        {
            id: '2C114:exception:dies-frodo',
            phases: ['RESPONSE'],
            cost: [],
            effects: [{ type: 'MAKE_RING_BEARER', resistance: 5 }],
            source: 'SELF',
            text: 'RESPONSE: If Frodo dies, make Sam the Ring-bearer (resistance 5).',
            trigger: {
                type: 'CHARACTER_DIES',
                target: [['Frodo']],
            },
        },
    ],
};
