import { ConversationMessage, ParticipantRole } from "../types/common";
import { Agent } from "./agent";

export class ReminderAgent extends Agent {
    constructor() {
        super({
            name: "Reminder Agent",
            description: "An Agent that creats a Reminder based on given input",
        });
    }

    processRequest(query: string, chatHistory: ConversationMessage[]): Promise<ConversationMessage> {
        return Promise.resolve({ role: ParticipantRole.ASSISTANT, content: [{ text: "Reminder created" }] });
    }
}
