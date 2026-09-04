import type { CardState, GameState, PlayerState, SiteCardState } from '../types';

const EMPTY_PATH: (SiteCardState | null)[] = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
];

export function createCard(
    overrides: Partial<CardState> & { id: string }
): CardState {
    return {
        instanceId: overrides.instanceId ?? overrides.id,
        kind: 'NONE',
        culture: 'SHIRE',
        type: 'CONDITION',
        set: 1,
        rarity: 'C',
        isUnique: false,
        ...overrides,
    };
}

export function createMinion(overrides: Partial<CardState> = {}): CardState {
    return createCard({
        id: 'test-minion',
        kind: 'SHADOW',
        type: 'MINION',
        culture: 'MORIA',
        title: 'Test Minion',
        twilightCost: 2,
        strength: 5,
        vitality: 3,
        ...overrides,
    });
}

export function createCompanion(overrides: Partial<CardState> = {}): CardState {
    return createCard({
        id: 'test-companion',
        kind: 'FREE_PEOPLE',
        type: 'COMPANION',
        culture: 'GONDOR',
        title: 'Test Companion',
        twilightCost: 2,
        strength: 5,
        vitality: 3,
        resistance: 6,
        ...overrides,
    });
}

export function createFollower(overrides: Partial<CardState> = {}): CardState {
    return createCard({
        id: 'test-follower',
        kind: 'FREE_PEOPLE',
        type: 'FOLLOWER',
        culture: 'GONDOR',
        title: 'Test Follower',
        twilightCost: 1,
        aidCost: { type: 'TWILIGHT', amount: 1 },
        ...overrides,
    });
}

export function createSite(
    overrides: Partial<SiteCardState> = {}
): SiteCardState {
    return {
        id: 'test-site',
        name: 'Test Site',
        twilightCost: 0,
        gameText: '',
        ownerId: '0',
        siteNumber: 1,
        ...overrides,
    };
}

export function createBiddingSetupState(): NonNullable<
    GameState['setupState']
> {
    return {
        bids: { '0': null, '1': null },
        mulligans: { '0': null, '1': null },
        step: 'BIDDING',
    };
}

export function createPlayerState(
    playerId: string,
    overrides: Partial<PlayerState> = {}
): PlayerState {
    const isFp = playerId === '0';

    return {
        profile: {
            name: isFp ? 'FP' : 'Shadow',
            avatar: '',
            faction: isFp ? 'freePeoples' : 'shadow',
        },
        deck: [],
        hand: [],
        discard: [],
        deadPile: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
        burdens: 0,
        threats: 0,
        ...overrides,
    };
}

export function createGameState(overrides: Partial<GameState> = {}): GameState {
    const basePlayers = {
        '0': createPlayerState('0'),
        '1': createPlayerState('1'),
    };

    return {
        fpPlayerId: '0',
        twilightPool: 0,
        currentSiteIndex: 0,
        movesThisTurn: 0,
        statusMessage: '',
        awaitingSiteSelection: false,
        skirmishes: [],
        path: [...EMPTY_PATH],
        battlefield: [],
        fellowshipCardsDrawn: 0,
        setupState: {
            bids: { '0': 0, '1': 0 },
            mulligans: { '0': false, '1': false },
            step: 'COMPLETE',
            auctionWinnerId: '0',
        },
        ...overrides,
        players: {
            ...basePlayers,
            ...overrides.players,
        },
    };
}
