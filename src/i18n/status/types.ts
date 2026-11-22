/** Clés de consignes partagées (chaque client les traduit localement). */
export type StatusKey =
    | 'BIDDING_SETUP'
    | 'SETUP_COMPLETE'
    | 'MULLIGAN_PROMPT'
    | 'MULLIGAN_WAITING'
    | 'BID_WAITING'
    | 'BID_REVEAL'
    | 'FELLOWSHIP_PHASE'
    | 'FELLOWSHIP_AFTER_SANCTUARY'
    | 'SHADOW_PHASE_START'
    | 'SHADOW_PHASE_PLAY'
    | 'MANEUVER_START'
    | 'MANEUVER_ACTION_WINDOW'
    | 'MANEUVER_DONE'
    | 'ARCHERY_START'
    | 'ARCHERY_ACTION_WINDOW'
    | 'ARCHERY_FP_ASSIGN'
    | 'ARCHERY_SHADOW_ASSIGN'
    | 'ARCHERY_DONE'
    | 'ARCHERY_SKIPPED'
    | 'ARCHERY_NO_MINIONS'
    | 'ASSIGNMENT_START'
    | 'ASSIGNMENT_NO_COMPANIONS'
    | 'SKIRMISH_START'
    | 'THREAT_WOUNDS_FIRST'
    | 'RESPONSE_OR_CHOICE_PENDING'
    | 'LURKER_LOCKED'
    | 'START_OF_PHASE_DONE_WAITING'
    | 'SHADOW_REFILL_HAND'
    | 'REGROUP_START'
    | 'REGROUP_ACTIONS'
    | 'OPTIONAL_EFFECT_AVAILABLE'
    | 'SITE_EFFECT_APPLIED'
    | 'PLAYED_CARD'
    | 'WAITING_RESPONSE'
    | 'WAITING_SHADOW_SITE'
    | 'TURN_TO_RESPOND'
    | 'FORCE_ASSIGN_PREVENTED'
    | 'DESIGNATE_TRIGGERED_TARGET'
    | 'REVEALED_UNDER_DECK'
    | 'MOVE_TO_SITE'
    | 'GENERIC';

export type StatusParams = Record<
    string,
    string | number | boolean | null | undefined
>;

export type StatusNotice = {
    key: StatusKey;
    params?: StatusParams;
};
