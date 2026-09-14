import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

const GAFFER_ABILITY: Ability = {
    id: '1U292:0',
    phases: ['FELLOWSHIP'],
    cost: [
        {
            discardFromPlay: [
                {
                    count: 1,
                    target: [['PIPEWEED', 'POSSESSION']],
                    mode: 'DESIGNATION',
                },
            ],
            spot: [{ count: 1, target: [['PIPE']] }],
        },
    ],
    effects: [{ type: 'REMOVE_TWILIGHT', countFromSpot: true }],
    source: 'SELF',
    text: 'Fellowship: Discard a pipeweed possession and spot X pipes to remove twilight X.',
};

const GANDALF_PIPE_ABILITY: Ability = {
    id: '1U74:0',
    phases: ['FELLOWSHIP'],
    cost: [
        {
            discardFromPlay: [
                {
                    count: 1,
                    target: [['PIPEWEED', 'POSSESSION']],
                    mode: 'DESIGNATION',
                },
            ],
            spot: [{ count: 1, target: [['PIPE']] }],
        },
    ],
    effects: [{ type: 'REMOVE_BURDENS', countFromSpot: true }],
    source: 'SELF',
    text: 'Fellowship: Discard a pipeweed possession and spot X pipes to remove X burdens.',
};

function createPipeweed() {
    return createCard({
        id: '1C305',
        title: 'Old Toby',
        type: 'POSSESSION',
        kind: 'FREE_PEOPLE',
        culture: 'SHIRE',
        keywords: ['PIPEWEED'],
    });
}

function createGafferPipe() {
    return createCard({
        id: '1U292',
        title: "The Gaffer's Pipe",
        type: 'POSSESSION',
        subtype: 'PIPE',
        kind: 'FREE_PEOPLE',
        culture: 'SHIRE',
        actionPhases: ['FELLOWSHIP'],
        abilities: [GAFFER_ABILITY],
    });
}

describe('Pipes — défausse pipeweed + spot X', () => {
    it('Pipe de l’Ancien : défausse l’herbe à pipe et retire autant de crépuscule que de pipes', () => {
        const hobbit = createCompanion({
            id: 'sam',
            title: 'Sam',
            race: 'HOBBIT',
            culture: 'SHIRE',
            attachments: [createGafferPipe()],
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [hobbit],
                        supportArea: [createPipeweed()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1U292', '1U292:0', '1C305');

        expect(engine.getG().twilightPool).toBe(3);
        expect(engine.getG().players['0']?.supportArea).toHaveLength(0);
        expect(engine.getG().players['0']?.discard.map((c) => c.id)).toEqual([
            '1C305',
        ]);
        expect(
            engine.getG().players['0']?.fellowshipArea[0]?.attachments?.[0]?.id
        ).toBe('1U292');

        engine.stop();
    });

    it('X = 2 pipes → retire 2 crépuscule', () => {
        const hobbit = createCompanion({
            id: 'sam',
            title: 'Sam',
            race: 'HOBBIT',
            culture: 'SHIRE',
            attachments: [createGafferPipe()],
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            culture: 'GONDOR',
            attachments: [
                createCard({
                    id: '1U91',
                    title: "Aragorn’s Pipe",
                    type: 'POSSESSION',
                    subtype: 'PIPE',
                    kind: 'FREE_PEOPLE',
                }),
            ],
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 5,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [hobbit, aragorn],
                        supportArea: [createPipeweed()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1U292', '1U292:0', '1C305');

        expect(engine.getG().twilightPool).toBe(3);

        engine.stop();
    });

    it('refuse sans herbe à pipe en jeu', () => {
        const hobbit = createCompanion({
            id: 'sam',
            race: 'HOBBIT',
            attachments: [createGafferPipe()],
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [hobbit],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1U292', '1U292:0', '1C305');

        expect(engine.getG().twilightPool).toBe(4);

        engine.stop();
    });

    it('refuse sans désigner l’herbe à pipe', () => {
        const hobbit = createCompanion({
            id: 'sam',
            race: 'HOBBIT',
            attachments: [createGafferPipe()],
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [hobbit],
                        supportArea: [createPipeweed()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1U292', '1U292:0');

        expect(engine.getG().twilightPool).toBe(4);
        expect(engine.getG().players['0']?.supportArea[0]?.id).toBe('1C305');

        engine.stop();
    });

    it('Pipe de Gandalf : retire X fardeaux', () => {
        const gandalf = createCompanion({
            id: 'gandalf',
            title: 'Gandalf',
            culture: 'GANDALF',
            attachments: [
                createCard({
                    id: '1U74',
                    title: "Gandalf’s Pipe",
                    type: 'POSSESSION',
                    subtype: 'PIPE',
                    kind: 'FREE_PEOPLE',
                    culture: 'GANDALF',
                    actionPhases: ['FELLOWSHIP'],
                    abilities: [GANDALF_PIPE_ABILITY],
                }),
            ],
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gandalf],
                        supportArea: [createPipeweed()],
                        burdens: 3,
                    }),
                },
            },
        });

        engine.moves.activateAbility('1U74', '1U74:0', '1C305');

        expect(engine.getG().players['0']?.burdens).toBe(2);
        expect(engine.getG().players['0']?.discard.map((c) => c.id)).toEqual([
            '1C305',
        ]);

        engine.stop();
    });
});

const HORNBLOWER_REMOVE_THREAT: Ability = {
    id: '17U108:0',
    phases: ['REGROUP'],
    cost: [
        {
            discardFromPlay: [
                {
                    count: 1,
                    target: [['PIPEWEED']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [{ type: 'REMOVE_THREATS', count: 1 }],
    source: 'SELF',
    text: 'Regroup: Discard a pipeweed from play to remove a threat.',
};

const HORNBLOWER_DISCARD_MINION: Ability = {
    id: '17U108:1',
    phases: ['REGROUP'],
    cost: [
        {
            discardFromPlay: [
                {
                    count: 1,
                    target: [['PIPEWEED']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [{ type: 'DISCARD', count: 1, target: [['MINION']] }],
    source: 'SELF',
    text: 'Regroup: Discard a pipeweed from play to discard a minion.',
};

describe('Hornblower Leaf — Discard pipeweed to …', () => {
    it('retire une menace', () => {
        const leaf = createCard({
            id: '17U108',
            title: 'Hornblower Leaf',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            keywords: ['PIPEWEED'],
            actionPhases: ['REGROUP'],
            abilities: [HORNBLOWER_REMOVE_THREAT],
        });
        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        supportArea: [leaf, createPipeweed()],
                        threats: 2,
                    }),
                },
            },
        });

        engine.moves.activateAbility('17U108', '17U108:0', '1C305');

        expect(engine.getG().players['0']?.threats).toBe(1);
        expect(engine.getG().players['0']?.discard.map((c) => c.id)).toEqual([
            '1C305',
        ]);

        engine.stop();
    });

    it('défausse un séide (coût + effet désignés)', () => {
        const leaf = createCard({
            id: '17U108',
            title: 'Hornblower Leaf',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            keywords: ['PIPEWEED'],
            actionPhases: ['REGROUP'],
            abilities: [HORNBLOWER_DISCARD_MINION],
        });
        const engine = createEngineClient({
            startPhase: 'regroup',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({ id: 'orc-a' }),
                    createMinion({ id: 'orc-b' }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        supportArea: [leaf, createPipeweed()],
                    }),
                },
            },
        });

        engine.moves.activateAbility(
            '17U108',
            '17U108:1',
            '1C305',
            [],
            'orc-b'
        );

        expect(engine.getG().players['0']?.discard.map((c) => c.id)).toEqual([
            '1C305',
        ]);
        expect(engine.getG().battlefield.map((c) => c.id)).toEqual(['orc-a']);
        expect(engine.getG().players['1']?.discard.map((c) => c.id)).toEqual([
            'orc-b',
        ]);

        engine.stop();
    });
});
