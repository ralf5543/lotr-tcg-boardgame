import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getEffectiveResistance, getEffectiveStrength } from '../../utils/cardStats';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import { createEngineClient } from './createEngineClient';

describe('Hobbits / Isengard vague 1 — runtime', () => {
    it('Merry : +2 par autre unbound assigné (pas lui, pas ring-bound)', () => {
        const merryCard = getCardById('11C168')!;
        const merry = createCompanion({
            ...merryCard,
            instanceId: 'merry',
            strength: 3,
        });
        const maggot = createCompanion({
            id: 'maggot',
            instanceId: 'maggot',
            title: 'Farmer Maggot',
            race: 'HOBBIT',
            strength: 3,
        });
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            title: 'Frodo',
            race: 'HOBBIT',
            keywords: ['RING-BOUND'],
            ringBearer: true,
            strength: 3,
        });
        const orc = createMinion({ id: 'orc', instanceId: 'orc' });
        const engine = createEngineClient({
            startPhase: 'skirmish',
            G: {
                skirmishes: [
                    {
                        id: 'sk-maggot',
                        companionId: 'maggot',
                        minionIds: ['orc'],
                    },
                    {
                        id: 'sk-frodo',
                        companionId: 'frodo',
                        minionIds: [],
                    },
                ],
                battlefield: [orc],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, maggot, merry],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        const G = engine.getG();
        const merryLive = G.players['0']!.fellowshipArea.find(
            (c) => c.instanceId === 'merry'
        )!;
        // Maggot unbound assigné → +2 ; Frodon ring-bound → ignore ; Merry exclu
        expect(getEffectiveStrength(merryLive, G)).toBe(
            (Number(merryLive.strength) || 0) + 2
        );
    });

    it('Sam : +1 résistance aux autres compagnons, pas à lui', () => {
        const samCard = getCardById('11U172')!;
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            title: 'Frodo',
            resistance: 10,
            ringBearer: true,
        });
        const sam = createCompanion({
            ...samCard,
            instanceId: 'sam',
            resistance: 5,
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, sam],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
        const G = engine.getG();
        const frodoLive = G.players['0']!.fellowshipArea[0]!;
        const samLive = G.players['0']!.fellowshipArea[1]!;
        expect(getEffectiveResistance(frodoLive, 0, G)).toBe(11);
        expect(getEffectiveResistance(samLive, 0, G)).toBe(5);
    });

    it('Measure of Comfort + Maggot dwelling + Gríma/Traître via condition Isengard', () => {
        const comfort = {
            ...getCardById('12S125')!,
            instanceId: 'comfort',
        };
        const maggot = {
            ...getCardById('0P93')!,
            instanceId: 'maggot',
            strength: 3,
        };
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry',
            title: 'Merry',
            strength: 3,
            resistance: 6,
            attachments: [
                {
                    ...getCardById('6U61')!,
                    instanceId: 'desertion',
                },
            ],
        });
        const grima = {
            ...getCardById('4C153')!,
            instanceId: 'grima',
            strength: 4,
        };
        const traitor = {
            ...getCardById('6C72')!,
            instanceId: 'traitor',
            strength: 6,
        };
        const dwelling = createSite({
            id: '18U140',
            instanceId: 'site1',
            keywords: ['DWELLING'],
            siteNumber: 1,
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            G: {
                currentSiteIndex: 0,
                path: [dwelling, null, null, null, null, null, null, null, null],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                instanceId: 'frodo',
                                race: 'HOBBIT',
                                resistance: 10,
                                ringBearer: true,
                                keywords: ['RING-BOUND'],
                            }),
                            maggot as ReturnType<typeof createCompanion>,
                            merry,
                        ],
                        supportArea: [comfort as ReturnType<typeof createCard>],
                        currentSiteIndex: 0,
                    }),
                    '1': createPlayerState('1', {
                        currentSiteIndex: 0,
                    }),
                },
                battlefield: [grima as ReturnType<typeof createMinion>, traitor as ReturnType<typeof createMinion>],
            },
        });
        const G = engine.getG();
        const fp = G.players['0']!;
        const maggotLive = fp.fellowshipArea.find((c) => c.instanceId === 'maggot')!;
        const merryLive = fp.fellowshipArea.find((c) => c.instanceId === 'merry')!;
        const traitorLive = G.battlefield.find((c) => c.instanceId === 'traitor')!;

        const maggotPrinted = Number(maggotLive.strength) || 0;
        const merryPrinted = Number(merryLive.strength) || 0;
        const traitorPrinted = Number(traitorLive.strength) || 0;

        // Maggot on dwelling → +4
        expect(getEffectiveStrength(maggotLive, G)).toBe(maggotPrinted + 4);
        // Comfort : Merry unbound +1 résistance
        expect(getEffectiveResistance(merryLive, 0, G)).toBe(
            (Number(merryLive.resistance) || 6) + 1
        );
        // Gríma : Merry porte une condition Ombre → force réduite
        expect(getEffectiveStrength(merryLive, G)).toBeLessThan(merryPrinted);
        // Traître spot companion bearing isengard condition → +2
        expect(getEffectiveStrength(traitorLive, G)).toBe(traitorPrinted + 2);
    });
});
