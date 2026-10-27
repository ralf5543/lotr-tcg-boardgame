/**
 * Chamber of Mazarbul (11S233) : « The Free Peoples player may transfer
 * Free Peoples artifacts and possessions at no twilight cost. »
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
import { transferAttachment } from '../moves/shadowMoves';

const TEXT =
    '<keyword>Underground.</keyword> The Free Peoples player may transfer Free Peoples artifacts and possessions at no twilight cost.';

const chamber = () =>
    createSite({
        id: '11S233',
        name: 'Chamber of Mazarbul',
        abilities: parseSiteAbilities(TEXT, '11S233') as never,
    });

function stateOn(board: ReturnType<typeof createSite>, opts: {
    attachmentType?: string;
    twilightCost?: number;
    pool?: number;
}) {
    const attachment = createCard({
        id: 'sword', instanceId: 'sword-1', type: opts.attachmentType || 'POSSESSION',
        kind: 'FREE_PEOPLE', twilightCost: opts.twilightCost ?? 2,
        name: 'Épée',
    });
    const host = createCompanion({ instanceId: 'aragorn', attachments: [attachment] });
    const target = createCompanion({ instanceId: 'legolas', attachments: [] });
    const fp = createPlayerState('0', { fellowshipArea: [host, target] });
    const sh = createPlayerState('1');
    const g = createGameState({ players: { '0': fp, '1': sh } });
    g.path = [board, createSite({ id: '11S228', name: 'Anduin Confluence' })];
    fp.currentSiteIndex = 0;
    g.twilightPool = opts.pool ?? 5;
    return { g, host, target, attachment };
}

const ctx = () => ({ phase: 'fellowship', currentPlayer: '0' });

describe('parse Chamber', () => {
    it('passif WHILE + FREE_FP_ATTACHMENT_TRANSFER (ARTIFACT/POSSESSION)', () => {
        const abs = parseSiteAbilities(TEXT, '11S233') as unknown as Array<{
            trigger?: { type?: string };
            effects?: Array<{ type: string; target?: string[][] }>;
        }>;
        expect(abs).toHaveLength(1);
        expect(abs[0].trigger?.type).toBe('WHILE');
        expect(abs[0].effects?.[0]).toMatchObject({
            type: 'FREE_FP_ATTACHMENT_TRANSFER',
            target: [['ARTIFACT'], ['POSSESSION']],
        });
    });
});

describe('Chamber : transfert', () => {
    it('sur Chamber : transfert gratuit (pool inchangé), attachement déplacé', () => {
        const { g, host, target } = stateOn(chamber(), {});
        const res = transferAttachment(
            { G: g, ctx: ctx(), playerID: '0' } as never,
            { attachmentId: 'sword-1', fromCharacterId: 'aragorn', toCharacterId: 'legolas' }
        );
        expect(res).toBeUndefined();
        expect(g.twilightPool).toBe(5);
        expect(host.attachments).toHaveLength(0);
        expect(target.attachments?.map((a) => a.instanceId)).toEqual(['sword-1']);
    });

    it('sur un autre site : le transfert coûte le crépuscule imprimé', () => {
        const plain = createSite({
            id: '11S228', name: 'Anduin Confluence', abilities: [],
        });
        const { g } = stateOn(plain, {});
        transferAttachment(
            { G: g, ctx: ctx(), playerID: '0' } as never,
            { attachmentId: 'sword-1', fromCharacterId: 'aragorn', toCharacterId: 'legolas' }
        );
        expect(g.twilightPool).toBe(7);
    });

    it('une situation (non artefact/possession) reste payante sur Chamber', () => {
        const { g } = stateOn(chamber(), { attachmentType: 'CONDITION' });
        transferAttachment(
            { G: g, ctx: ctx(), playerID: '0' } as never,
            { attachmentId: 'sword-1', fromCharacterId: 'aragorn', toCharacterId: 'legolas' }
        );
        expect(g.twilightPool).toBe(7);
    });
});
