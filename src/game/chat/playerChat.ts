/** Payload chat joueur — distinct des sync techniques (ex. flèches). */
export const PLAYER_CHAT_TYPE = 'PLAYER_CHAT' as const;

export type PlayerChatPayload = {
    type: typeof PLAYER_CHAT_TYPE;
    text: string;
};

export type ChatLike = {
    id?: string;
    sender: string;
    payload: unknown;
};

export function isPlayerChatPayload(
    value: unknown
): value is PlayerChatPayload {
    if (!value || typeof value !== 'object') return false;
    const payload = value as Partial<PlayerChatPayload>;
    return (
        payload.type === PLAYER_CHAT_TYPE &&
        typeof payload.text === 'string' &&
        payload.text.trim().length > 0
    );
}

export function makePlayerChatPayload(text: string): PlayerChatPayload | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return { type: PLAYER_CHAT_TYPE, text: trimmed.slice(0, 400) };
}

/** Messages joueur visibles dans le fil (ignore flèches / sync). */
export function listPlayerChatMessages(
    messages: ChatLike[] | undefined
): Array<{ id: string; sender: string; text: string }> {
    if (!messages?.length) return [];
    const out: Array<{ id: string; sender: string; text: string }> = [];
    for (let i = 0; i < messages.length; i += 1) {
        const message = messages[i];
        if (!isPlayerChatPayload(message.payload)) continue;
        out.push({
            id: message.id ?? `chat-${i}-${message.sender}`,
            sender: message.sender,
            text: message.payload.text,
        });
    }
    return out;
}
