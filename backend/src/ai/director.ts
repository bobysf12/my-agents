import { Agent } from "./agents/agent";
import { Classifier } from "./classifiers/classifier";
import { Context } from "./storages/context";
import { ToolRegistry } from "./tools/tool-registry";

class Director {
    private agents: Agent[] = [];
    private tools: ToolRegistry;
    private classifier: Classifier;

    constructor(tools: ToolRegistry, classifier: Classifier) {
        this.tools = tools;
        this.classifier = classifier;
    }

    // Register an agent
    registerAgent(agent: Agent) {
        this.agents.push(agent);
    }

    // Handle query
    async handleQuery(query: string, context: Context): Promise<string> {
        // Classify the query using agent descriptions
        const classification = await this.classifier.classifyQuery(query, this.agents);

        // Find the classified agent and route the query
        const agent = this.agents.find((agent) => agent.name === classification);
        if (agent) {
            return await agent.processRequest(query, context, this.tools);
        }

        return `No agent found to handle the classification: ${classification}`;
    }
}

export default Director;
