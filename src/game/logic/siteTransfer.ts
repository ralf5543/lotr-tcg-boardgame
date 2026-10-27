/**
 * Chamber of Mazarbul : le FP peut transférer ses artefacts et
 * possessions sans coût de crépuscule tant que la compagnie est sur
 * le site. Lu par le move de transfert (`transferAttachment`).
 */

import type { CardState, GameState } from '../types';
import { getCurrentSite } from './sites';
import { cardMatchesTarget } from '../engine/validations/matchers';

/** true si le transfert de cet attachement est gratuit au site courant. */
export function isFreeFpAttachmentTransfer(
    G: GameState,
    attachment: CardState
): boolean {
    if (attachment.kind !== 'FREE_PEOPLE') return false;
    const site = getCurrentSite(G);
    if (!site?.abilities?.length) return false;
    for (const ability of site.abilities) {
        if (ability.trigger?.type !== 'WHILE') continue;
        for (const effect of ability.effects || []) {
            if (effect.type !== 'FREE_FP_ATTACHMENT_TRANSFER') continue;
            if (cardMatchesTarget(attachment, effect.target)) return true;
        }
    }
    return false;
}
