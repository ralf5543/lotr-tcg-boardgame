/**
 * Harrowdale (11S243) : « Until the regroup phase, each minion
 * skirmishing a Rohan companion loses fierce and cannot gain Fierce. »
 * Passif de suppression lu dans getEffectiveKeywords.
 */

import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createCompanion,
    createSite,
    createCard,
} from './createGameState';
import { getKeywordValue } from '../engine/keywords/keywordUtils';

const TEXT =
    'Until the regroup phase, each minion skirmishing a Rohan companion loses fierce and cannot gain Fierce.';

const harrowdale = () =>
    createSite({
        id: '11S243',
        name: 'Harrowdale',
        abilities: parseSiteAbilities(TEXT, '11S243') as never,
    });

function stateOn(board: ReturnType<typeof createSite>, opts: {
    companion: ReturnType<typeof createCompanion>;
    minion: ReturnType<typeof createCard>;
    skirmishCompanionId?: string;
}) {
    const fp = createPlayerState('0', {
        fellowshipArea: [opts.companion],
        supportArea: [],
    });
    const sh = createPlayerState('1');
    const g = createGameState({ players: { '0': fp, '1': sh } });
    g.path = [board, createSite({ id: '11S228', name: 'Anduin Confluence' })];
    fp.currentSiteIndex = 0;
    g.battlefield = [opts.minion];
    g.skirmishes = [
        {
            id: 'sk-1',
            companionId: opts.skirmishCompanionId ?? opts.companion.instanceId!,
            minionIds: [opts.minion.instanceId!],
        },
    ];
    g.activeSkirmishId = 'sk-1';
    return g;
}

const rohanCompanion = () => {
    const c = createCompanion({ instanceId: 'eowyn', id: 'eowyn', name: 'Éowyn' });
    (c as { culture?: string }).culture = 'ROHAN';
    return c;
};

const otherCompanion = () => {
    const c = createCompanion({ instanceId: 'aragorn', id: 'aragorn', name: 'Aragorn' });
    (c as { culture?: string }).culture = 'GONDOR';
    return c;
};

const fierceMinion = () =>
    createCard({
        id: 'uruk', instanceId: 'uruk-1', type: 'MINION', kind: 'SHADOW',
        keywords: ['FIERCE'],
    });

describe('parse Harrowdale', () => {
    it('passif WHILE skirmishing ROHAN + MODIFY_KEYWORD FIERCE suppress', () => {
        const abs = parseSiteAbilities(TEXT, '11S243') as unknown as Array<{
            trigger?: { type?: string; skirmishing?: { target?: string[][] } };
            effects?: Array<{ type: string; keyword?: string; suppress?: boolean }>;
        }>;
        expect(abs).toHaveLength(1);
        expect(abs[0].trigger).toMatchObject({
            type: 'WHILE',
            skirmishing: { target: [['ROHAN']] },
        });
        expect(abs[0].effects?.[0]).toMatchObject({
            type: 'MODIFY_KEYWORD',
            keyword: 'FIERCE',
            suppress: true,
            skirmishingHostedByEffect: true,
        });
    });
});

describe('Harrowdale : suppression effective', () => {
    it('séide Fierce contre un compagnon Rohan → FIERCE absent', () => {
        const g = stateOn(harrowdale(), {
            companion: rohanCompanion(),
            minion: fierceMinion(),
        });
        expect(getKeywordValue(g.battlefield![0], 'FIERCE', g)).toBe(-1);
    });

    it('séide Fierce contre un compagnon non-Rohan → FIERCE conservé', () => {
        const g = stateOn(harrowdale(), {
            companion: otherCompanion(),
            minion: fierceMinion(),
        });
        expect(getKeywordValue(g.battlefield![0], 'FIERCE', g)).toBe(0);
    });

    it('séide Fierce sans escarmouche → FIERCE conservé', () => {
        const minion = fierceMinion();
        const g = stateOn(harrowdale(), {
            companion: rohanCompanion(),
            minion,
            skirmishCompanionId: 'quelquun-autre',
        });
        g.skirmishes = [];
        g.activeSkirmishId = undefined;
        expect(getKeywordValue(minion, 'FIERCE', g)).toBe(0);
    });

    it('sur un autre site (sans le passif) → FIERCE conservé face à Rohan', () => {
        const plain = createSite({
            id: '11S228',
            name: 'Anduin Confluence',
            abilities: [],
        });
        const g = stateOn(plain, {
            companion: rohanCompanion(),
            minion: fierceMinion(),
        });
        expect(getKeywordValue(g.battlefield![0], 'FIERCE', g)).toBe(0);
    });
});
