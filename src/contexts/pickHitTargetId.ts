export type HitCandidate = {
    id: string;
    /** Possession / Anneau / pile sur l’hôte — chevauche souvent le personnage. */
    isNestedOnHost: boolean;
    isZone: boolean;
    area: number;
};

const ZONE_IDS = new Set([
    'fellowshipArea',
    'sitePath',
    'supportArea',
    'battlefield',
]);

export function isGlobalZoneId(id: string): boolean {
    return ZONE_IDS.has(id);
}

/** Élément enregistré comme attachement ou carte empilée sur un hôte. */
export function isNestedOnHostElement(el: HTMLElement): boolean {
    return Boolean(
        el.closest('.attachments-group') || el.closest('.stacked-on-host')
    );
}

/**
 * Parmi les cibles sous le curseur, choisir laquelle « gagne ».
 * - Drop normal : préférer l’hôte (personnage) aux cartes déjà attachées /
 *   empilées qui chevauchent son rectangle (sinon halo au pixel près).
 * - Désignation : préférer la carte imbriquée si elle est autorisée (plus précise).
 */
export function pickHitTargetId(
    candidates: HitCandidate[],
    options: {
        allowedIds?: string[];
        preferSupportZone?: boolean;
    } = {}
): string | null {
    if (!candidates.length) return null;

    const { allowedIds, preferSupportZone } = options;
    const restrictToDesignation = Boolean(allowedIds?.length);

    const zones = candidates.filter((c) => c.isZone);
    const cards = candidates.filter((c) => !c.isZone);

    if (preferSupportZone && zones.some((z) => z.id === 'supportArea')) {
        return 'supportArea';
    }

    if (restrictToDesignation) {
        const allowed = cards.filter((c) => allowedIds!.includes(c.id));
        if (!allowed.length) return null;
        // Plus spécifique d’abord (attachement / pile), puis plus petite aire.
        allowed.sort((a, b) => {
            if (a.isNestedOnHost !== b.isNestedOnHost) {
                return a.isNestedOnHost ? -1 : 1;
            }
            return a.area - b.area;
        });
        return allowed[0]!.id;
    }

    if (cards.length) {
        const hosts = cards.filter((c) => !c.isNestedOnHost);
        const pool = hosts.length ? hosts : cards;
        pool.sort((a, b) => a.area - b.area);
        return pool[0]!.id;
    }

    return zones[0]?.id ?? null;
}
