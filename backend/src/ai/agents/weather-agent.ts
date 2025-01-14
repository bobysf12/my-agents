import { ConversationMessage, ParticipantRole } from "../types/common";
import { Agent } from "./agent";

export class WeatherAgent extends Agent {
    constructor() {
        super({
            name: "Weather Agent",
            description: "An Agent that checks current weather on the given city location",
        });
    }

    processRequest(query: string, chatHistory: ConversationMessage[]): Promise<ConversationMessage> {
        // Public API
        return Promise.resolve({ role: ParticipantRole.ASSISTANT, content: [{ text: "Weather is 30 celcius" }] });
    }
}
