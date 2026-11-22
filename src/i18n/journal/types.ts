/** Clés de faits journal (chaque client traduit localement). */
export type JournalKey =
    | 'PHASE'
    | 'PLAYED_CARD'
    | 'DISCARDED_FROM_PLAY'
    | 'WOUND_TAKEN'
    | 'WOUND_TAKEN_DIED'
    | 'HEALED'
    | 'MOVED_TO_SITE'
    | 'DECIDED_STOP'
    | 'DECIDED_MOVE_AGAIN'
    | 'SIDE_FREE_PEOPLES'
    | 'SIDE_SHADOW'
    | 'SETUP_COMPLETE'
    | 'MULLIGAN_DONE'
    | 'MULLIGAN_KEPT'
    | 'BID_PLACED'
    | 'BID_WON'
    | 'ABILITY_USED_CHARACTER'
    | 'ABILITY_USED_SUPPORT'
    | 'ABILITY_USED_ATTACHED'
    | 'ABILITY_EXERT_BUFF_TARGET'
    | 'ABILITY_EXERT_FOR_EFFECT'
    | 'DISCARDED_HAND'
    | 'DISCARDED_HAND_MUSTER'
    | 'MUSTER_VALIDATED'
    | 'SKIRMISH_WON'
    | 'SKIRMISH_WON_PLURAL'
    | 'OVERWHELMED_DIED'
    | 'RING_BURDENS_INSTEAD'
    | 'ASSIGNED'
    | 'ASSIGNED_AMBUSH'
    | 'ASSIGNED_STRENGTH'
    | 'YIELD_ASSIGNMENT_TO_SHADOW'
    | 'SHADOW_LEFT_UNASSIGNED'
    | 'ASSIGNMENT_DONE'
    | 'SKIRMISH_CANCELLED'
    | 'GAME_WON';

export type JournalParams = Record<
    string,
    string | number | boolean | null | undefined
>;

export type JournalNotice = {
    key: JournalKey;
    params?: JournalParams;
};

/** Forme acteur (Vous / nom) ou ligne neutre. */
export type JournalForms = {
    named: string;
    vous?: string;
};
