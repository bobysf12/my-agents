import { Context } from "../storages/context";
import { ToolRegistry } from "../tools/tool-registry";

export type AgentOptions = {};

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
    name: string;

    description: string;

    // Process the query and return a response
    abstract processRequest(query: string, context: Context, tools: ToolRegistry): Promise<string>;

    constructor(options: AgentOptions) {}
}
