import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useLocalFaction, type Faction } from '../../../../contexts/FactionContext';
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
    publish: (
        fromCardId: string | null,
        toCardId: string | null,
        faction: Faction
    ) => void;
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
    const lastSentRef = useRef(`${null}|${null}|${null}`);
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
        (
            fromCardId: string | null,
            toCardId: string | null,
            faction: Faction
        ) => {
            const key = `${fromCardId}|${toCardId}|${faction}`;
            if (lastSentRef.current === key) return;
            lastSentRef.current = key;
            const payload: TargetingArrowSyncPayload = {
                type: TARGETING_ARROW_TYPE,
                fromCardId,
                toCardId,
                faction,
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
    const faction = useLocalFaction();
    useEffect(() => {
        if (!publish) return;
        if (!isActive) {
            publish(null, null, faction);
            return;
        }
        publish(fromCardId, toCardId, faction);
        return () => publish(null, null, faction);
    }, [publish, isActive, fromCardId, toCardId, faction]);
};
