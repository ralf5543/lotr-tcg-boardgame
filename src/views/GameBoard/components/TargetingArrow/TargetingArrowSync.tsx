import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    getRemoteTargetingArrow,
    isTargetingArrowPayload,
    TARGETING_ARROW_TYPE,
    type TargetingArrowSyncPayload,
} from './sync';

type ChatLike = {
    sender: string;
    payload: unknown;
};

interface TargetingArrowSyncValue {
    remote: TargetingArrowSyncPayload | null;
    publish: (fromCardId: string | null, toCardId: string | null) => void;
}

const TargetingArrowSyncContext =
    createContext<TargetingArrowSyncValue | null>(null);

const CHANNEL_NAME = 'lotr_targeting_arrow';

interface TargetingArrowSyncProviderProps {
    myId: string;
    matchID?: string;
    sendChatMessage?: (payload: unknown) => void;
    chatMessages?: ChatLike[];
    children: React.ReactNode;
}

export const TargetingArrowSyncProvider: React.FC<
    TargetingArrowSyncProviderProps
> = ({ myId, matchID, sendChatMessage, chatMessages, children }) => {
    const [remote, setRemote] = useState<TargetingArrowSyncPayload | null>(
        null
    );
    const lastSentRef = useRef(`${null}|${null}`);
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        setRemote(getRemoteTargetingArrow(chatMessages, myId));
    }, [chatMessages, myId]);

    useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = channel;
        const onMessage = (event: MessageEvent) => {
            const data = event.data;
            if (
                !data ||
                data.matchID !== matchID ||
                data.senderId === myId ||
                !isTargetingArrowPayload(data)
            ) {
                return;
            }
            if (!data.fromCardId || !data.toCardId) {
                setRemote(null);
                return;
            }
            setRemote(data);
        };
        channel.addEventListener('message', onMessage);
        return () => {
            channel.removeEventListener('message', onMessage);
            channel.close();
            channelRef.current = null;
        };
    }, [matchID, myId]);

    const publish = useCallback(
        (fromCardId: string | null, toCardId: string | null) => {
            const key = `${fromCardId}|${toCardId}`;
            if (lastSentRef.current === key) return;
            lastSentRef.current = key;
            const payload: TargetingArrowSyncPayload = {
                type: TARGETING_ARROW_TYPE,
                fromCardId,
                toCardId,
            };
            sendChatMessage?.(payload);
            channelRef.current?.postMessage({
                ...payload,
                matchID,
                senderId: myId,
            });
        },
        [matchID, myId, sendChatMessage]
    );

    const value = useMemo(
        () => ({ remote, publish }),
        [remote, publish]
    );

    return (
        <TargetingArrowSyncContext.Provider value={value}>
            {children}
        </TargetingArrowSyncContext.Provider>
    );
};

export const useTargetingArrowSync = () =>
    useContext(TargetingArrowSyncContext);

export const usePublishTargetingArrow = (
    isActive: boolean,
    fromCardId: string | null,
    toCardId: string | null
) => {
    const sync = useTargetingArrowSync();
    const publish = sync?.publish;
    useEffect(() => {
        if (!publish) return;
        if (!isActive) {
            publish(null, null);
            return;
        }
        publish(fromCardId, toCardId);
        return () => publish(null, null);
    }, [publish, isActive, fromCardId, toCardId]);
};
