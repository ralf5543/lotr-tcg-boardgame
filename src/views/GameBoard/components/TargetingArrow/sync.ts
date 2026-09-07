export const TARGETING_ARROW_TYPE = 'TARGETING_ARROW' as const;

/** Ancre DOM de la carte d’événement en attente (overlay adverse). */
export const PENDING_PLAY_ORIGIN_ID = 'pendingPlay';

export type TargetingArrowSyncPayload = {
    type: typeof TARGETING_ARROW_TYPE;
    fromCardId: string | null;
    toCardId: string | null;
};

type ChatLike = {
    sender: string;
    payload: unknown;
};

export function isTargetingArrowPayload(
    value: unknown
): value is TargetingArrowSyncPayload {
    if (!value || typeof value !== 'object') return false;
    const payload = value as Partial<TargetingArrowSyncPayload>;
    return (
        payload.type === TARGETING_ARROW_TYPE &&
        (payload.fromCardId === null ||
            typeof payload.fromCardId === 'string') &&
        (payload.toCardId === null || typeof payload.toCardId === 'string')
    );
}

export function getRemoteTargetingArrow(
    messages: ChatLike[] | undefined,
    myId: string
): TargetingArrowSyncPayload | null {
    if (!messages?.length) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const message = messages[i];
        if (message.sender === myId) continue;
        if (!isTargetingArrowPayload(message.payload)) continue;
        if (!message.payload.fromCardId || !message.payload.toCardId) {
            return null;
        }
        return message.payload;
    }
    return null;
}
