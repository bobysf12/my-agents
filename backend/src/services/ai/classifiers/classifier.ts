import OpenAI from "openai";
import { Agent } from "../agents/agent";

export class Classifier {
    private openai: OpenAI;

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey,
        });
    }

    // Handle the query by routing it to the appropriate agent(s)
    async classifyQuery(query: string, agents: Agent[]): Promise<string> {
        // Compile agent descriptions
        const agentDescriptions = agents.map((agent) => `- ${agent.name}: ${agent.description}`).join("\n");

        const prompt = `
		You are an intelligent assistant. Based on the given query, decide which of the following agents should handle it. If there are multiple agents, list down the agents in comma separated text

		Agents: ${agentDescriptions}

        Only return the agent name without adding explainations or any other contents.
	`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "assistant",
                    content: prompt,
                },
                {
                    role: "user",
                    content: query,
                },
            ],
        });

        const classification = response.choices[0].message.content.replace(/\t/g, "").trim();
        if (!classification || classification.trim() === "") {
            return "No agents classified for the given query.";
        }
        return classification;
    }
}
