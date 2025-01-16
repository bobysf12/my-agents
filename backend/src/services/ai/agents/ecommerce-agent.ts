import { ConversationMessage, ParticipantRole } from "../types/common";
import { Agent } from "./agent";

export class EcommerceAgent extends Agent {
    constructor() {
        super({
            name: "Ecommerce Agent",
            description: "An Agent that goes to the web and find the cheapest price of the given item name",
        });
    }

    processRequest(query: string, chatHistory: ConversationMessage[]): Promise<ConversationMessage> {
        return Promise.resolve({ role: ParticipantRole.USER, content: [{ text: "The cheapest price is 12k" }] });
    }
}
