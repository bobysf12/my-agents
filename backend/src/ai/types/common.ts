export enum ParticipantRole {
    ASSISTANT = "assistant",
    USER = "user",
}
export type ConversationMessage = {
    role: ParticipantRole;
    content: any[] | undefined;
};

export type TimestampedMessage = ConversationMessage & { timestamp: number };
