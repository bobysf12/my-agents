import { Agent, AgentResponse } from "./agents/agent";
import { Classifier } from "./classifiers/classifier";
import { Storage } from "./storages/storage";
import { ParticipantRole } from "./types/common";

type Logger = {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
};

type DirectorOptions = {
    storage: Storage;
    classifier: Classifier;
    logger: Logger;
};
class Director {
    private agents: Agent[] = [];
    private classifier: Classifier;
    private storage: Storage;
    private logger: Logger;

    constructor(opt: DirectorOptions) {
        this.classifier = opt.classifier;
        this.storage = opt.storage;
        this.logger = opt.logger;
    }

    // Register an agent
    registerAgent(agent: Agent) {
        this.agents.push(agent);
    }

    // Handle query
    async handleQuery(query: string, userId: string, sessionId: string): Promise<AgentResponse> {
        // Classify the query using agent descriptions
        const classification = await this.classifier.classifyQuery(query, this.agents);

        this.logger.info(
            this.agents.map((agent) => agent.name + " - " + agent.description),
            "Available Agents",
        );

        // Find the classified agent and route the query
        const selectedAgent = this.agents.find((agent) => agent.name === classification);

        if (selectedAgent) {
            this.logger.debug(selectedAgent, "Selected Agent");
            const chatHistory = await this.storage.fetchAllChats(userId, sessionId);

            this.storage.saveChatMessage(userId, sessionId, selectedAgent.id, {
                role: ParticipantRole.USER,
                content: [{ text: query }],
            });

            const agentResponse = await selectedAgent.processRequest(query, chatHistory || []);
            this.storage.saveChatMessage(userId, sessionId, selectedAgent.id, agentResponse);

            return {
                output: agentResponse.content[0].text,
                metadata: {
                    query,
                    sessionId,
                    userId,
                    agentId: selectedAgent.id,
                    agentName: selectedAgent.name,
                },
            };
        }

        return {
            output: "No agent found",
            metadata: {
                query,
                sessionId,
                userId,
                agentName: "",
                agentId: "",
            },
        };
    }
}

export default Director;
