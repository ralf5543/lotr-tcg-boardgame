import type { CardState, PlayerState, SiteCardState } from '../types';
import type { DeckConfig } from '../../decks/types';
import { buildDeckFromIds } from '../../utils/deckBuilder';
import { getCardById } from '../cardsData';
import { defaultAvatarForSeat } from '../../session/playerProfile';

export type ProfileSeed = {
    name?: string;
    avatar?: string;
};

type RandomLike = {
    Shuffle: <T>(deck: T[]) => T[];
};

function createCardInstance(
    cardId: string,
    playerId: string,
    suffix: string
): CardState {
    const baseCard = getCardById(cardId);
    if (!baseCard) {
        throw new Error(`Carte introuvable : ${cardId}`);
    }
    return {
        ...baseCard,
        printedId: baseCard.printedId || baseCard.id,
        id: `p${playerId}-${baseCard.id}-${suffix}`,
        isFaceDown: false,
    };
}

/** Joueur vide (siège pas encore chargé en antichambre). */
export function createStubPlayer(
    playerId: string,
    profileSeed?: ProfileSeed
): PlayerState {
    const isP0 = playerId === '0';
    return {
        profile: {
            name: profileSeed?.name?.trim() || `Joueur ${playerId}`,
            avatar:
                profileSeed?.avatar?.trim() ||
                defaultAvatarForSeat(playerId).path,
            faction: isP0 ? 'freePeoples' : 'shadow',
        },
        deck: [],
        hand: [],
        discard: [],
        deadPile: [],
        removedFromGame: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
        burdens: 0,
        threats: 0,
    };
}

/**
 * Construit un joueur complet (pioche, sites, compagnie de départ) + mélange.
 */
export function assemblePlayer(
    playerId: string,
    deckConfig: DeckConfig,
    profileSeed: ProfileSeed | undefined,
    random: RandomLike
): PlayerState {
    const isP0 = playerId === '0';
    const fullDeckIds = [...deckConfig.freePeople, ...deckConfig.shadow];

    const siteCards = buildDeckFromIds(deckConfig.siteIds || [], playerId);
    const sitesDeck: SiteCardState[] = siteCards.map((card) => ({
        ...card,
        ownerId: playerId,
        siteNumber: undefined,
    })) as SiteCardState[];

    const player: PlayerState = {
        profile: {
            name: profileSeed?.name?.trim() || `Joueur ${playerId}`,
            avatar:
                profileSeed?.avatar?.trim() ||
                defaultAvatarForSeat(playerId).path,
            faction: isP0 ? 'freePeoples' : 'shadow',
        },
        deck: buildDeckFromIds(fullDeckIds, playerId),
        hand: [],
        discard: [],
        deadPile: [],
        removedFromGame: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck,
        currentSiteIndex: 0,
        burdens: 0,
        threats: 0,
    };

    const ringBearer = createCardInstance(
        deckConfig.ringBearerId,
        playerId,
        'ringbearer'
    );
    const oneRing = createCardInstance(
        deckConfig.oneRingId,
        playerId,
        'onering'
    );

    if (!ringBearer.keywords) ringBearer.keywords = [];
    if (!ringBearer.keywords.includes('RING-BEARER')) {
        ringBearer.keywords.push('RING-BEARER');
    }
    ringBearer.isStartingMember = true;
    ringBearer.attachments = [oneRing];
    player.fellowshipArea = [ringBearer];

    deckConfig.startingCompanionIds.forEach((cardId, index) => {
        const companion = createCardInstance(
            cardId,
            playerId,
            `starting-comp-${index}`
        );
        companion.isFaceDown = true;
        companion.isStartingMember = true;
        player.fellowshipArea.push(companion);
    });

    player.deck = random.Shuffle(player.deck);
    return player;
}
