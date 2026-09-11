import type { Ability } from '../../../types';

/** Capacité(s) injectée(s) hors parser, pour une carte donnée (Collectors Info). */
export interface CardException {
    cardId: string;
    abilities: Ability[];
}
