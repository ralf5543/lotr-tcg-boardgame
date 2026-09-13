import { createContext, useContext } from 'react';

export type AssignedMinionsTrackValue = {
    track: HTMLElement | null;
    scroller: HTMLElement | null;
};

export const AssignedMinionsTrackContext =
    createContext<AssignedMinionsTrackValue>({
        track: null,
        scroller: null,
    });

export const useAssignedMinionsTrack = (): AssignedMinionsTrackValue =>
    useContext(AssignedMinionsTrackContext);
