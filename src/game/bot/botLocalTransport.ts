import { Local } from 'boardgame.io/multiplayer';

/**
 * Une seule fabrique Local pour le match solo :
 * humain (React Client) + BotDriver doivent partager le même master.
 */
export const botMatchLocal = Local();
