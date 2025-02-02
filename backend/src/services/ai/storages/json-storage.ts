import { ConversationMessage, ParticipantRole, TimestampedMessage } from "../types/common";
import { Storage } from "./storage";
import * as fs from "fs";

export class JsonStorage extends Storage {
    private conversations: Map<string, TimestampedMessage[]>;

    private filePath: string;

    constructor(filePath: string) {
        super();
        this.filePath = filePath;
        this.conversations = this.loadConversations();
    }
    private loadConversations(): Map<string, TimestampedMessage[]> {
        if (!fs.existsSync(this.filePath)) {
            return new Map();
        }
        const data = fs.readFileSync(this.filePath, "utf-8");
        const parsedData = JSON.parse(data);
        return new Map(Object.entries(parsedData));
    }

    private saveConversations(): void {
        const data = JSON.stringify(Object.fromEntries(this.conversations), null, 2);
        fs.writeFileSync(this.filePath, data, "utf-8");
    }

    async saveChatMessage(
        userId: string,
        sessionId: string,
        agentId: string,
        newMessage: ConversationMessage,
        maxHistorySize?: number,
    ): Promise<ConversationMessage[]> {
        const key = this.generateKey(userId, sessionId, agentId);
        let conversation = this.conversations.get(key) || [];

        if (super.isConsecutiveMessage(conversation, newMessage)) {
            this.saveConversations();
            return this.removeTimestamps(conversation);
        }

        const timestampedMessage: TimestampedMessage = { ...newMessage, timestamp: Date.now() };
        conversation = [...conversation, timestampedMessage];
        conversation = super.trimConversation(conversation, maxHistorySize) as TimestampedMessage[];

        this.conversations.set(key, conversation);
        this.saveConversations();
        return this.removeTimestamps(conversation);
    }

    async fetchChat(
        userId: string,
        sessionId: string,
        agentId: string,
        maxHistorySize?: number,
    ): Promise<ConversationMessage[]> {
        const key = this.generateKey(userId, sessionId, agentId);
        let conversation = this.conversations.get(key) || [];
        if (maxHistorySize !== undefined) {
            conversation = super.trimConversation(conversation, maxHistorySize) as TimestampedMessage[];
        }
        return this.removeTimestamps(conversation);
    }

    async fetchAllChats(userId: string, sessionId: string): Promise<ConversationMessage[]> {
        const allMessages: TimestampedMessage[] = [];
        for (const [key, messages] of this.conversations.entries()) {
            const [storedUserId, storedSessionId, agentId] = key.split("#");
            if (storedUserId === userId && storedSessionId === sessionId) {
                // Add messages with their associated agentId
                allMessages.push(
                    ...messages.map((message) => ({
                        ...message,
                        content:
                            message.role === ParticipantRole.ASSISTANT
                                ? [{ text: `[${agentId}] ${message.content?.[0]?.text || ""}` }]
                                : message.content,
                    })),
                );
            }
        }
        // Sort messages by timestamp
        allMessages.sort((a, b) => a.timestamp - b.timestamp);
        this.saveConversations();
        return this.removeTimestamps(allMessages);
    }

    private generateKey(userId: string, sessionId: string, agentId: string): string {
        return `${userId}#${sessionId}#${agentId}`;
    }

    private removeTimestamps(messages: TimestampedMessage[]): ConversationMessage[] {
        return messages.map(({ timestamp: _timestamp, ...message }) => message);
    }
}
