export const SOUND_LIBRARY = {
    // ui
    
    // Cardq
    CARD_PLAY: '/audio/sfx/cards/play_card.opus',
    
    // Battle
} as const;

export type SoundEffect = keyof typeof SOUND_LIBRARY;