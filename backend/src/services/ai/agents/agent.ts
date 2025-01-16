import { Tool } from "../tools/tool";
import { ConversationMessage } from "../types/common";

export type AgentOptions = {
    // The name of the agent
    name: string;

    // A description of the agent's purpose or capabilities
    description: string;

    tools?: Tool[];
};

export type AgentProcessingResult = {
    query: string;
    agentId: string;
    agentName: string;
    userId: string;
    sessionId: string;
    additionalParams?: Record<string, any>;
};

export type AgentResponse = {
    metadata: AgentProcessingResult;
    output: string;
};

export abstract class Agent {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    protected tools: Tool[];

    // Process the query and return a response
    abstract processRequest(query: string, chatHistory: ConversationMessage[]): Promise<ConversationMessage>;

    constructor(options: AgentOptions) {
        this.name = options.name;
        this.description = options.description;
        this.id = this.generateIdFromName(options.name);
        this.tools = options.tools || [];
    }

    private generateIdFromName(name: string): string {
        // Remove special characters and replace spaces with hyphens
        const key = name
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase();
        return key;
    }
}
