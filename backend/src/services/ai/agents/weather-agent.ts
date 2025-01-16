import OpenAI from "openai";
import { Tool } from "../tools/tool";
import { ConversationMessage, ParticipantRole } from "../types/common";
import { Agent } from "./agent";
import { ChatCompletionMessageParam } from "openai/resources";
import { createLogger } from "../../utils/logger";

type WeatherAgentOptions = {
    tools: Tool[];
    openai: OpenAI;
};

const logger = createLogger("WeatherAgent");

export class WeatherAgent extends Agent {
    openai: OpenAI;

    constructor(options: WeatherAgentOptions) {
        super({
            name: "Weather Agent",
            description: "An Agent that checks current weather on the given city location",
            tools: options.tools,
        });
        this.openai = options.openai;
    }

    async processRequest(query: string, chatHistory: ConversationMessage[]): Promise<ConversationMessage> {
        const prompt =
            "You are a weather assistant. Please provide the current weather information for the specified city.";

        const messages: ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: prompt,
            },
            { role: "user", content: query },
        ];

        let iterationCount = 0;
        let finishReason = "";

        while (iterationCount < 5 && finishReason !== "stop") {
            logger.debug("Loop " + (iterationCount + 1));

            const response = await this.openai.chat.completions.create({
                tools: this.getToolDefinitions(),
                tool_choice: "auto",
                model: "gpt-4o-mini",
                messages,
            });

            logger.debug(response);

            messages.push(response.choices[0].message);

            const toolCalls = response.choices[0]?.message?.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    const tool = this.tools.find((t) => t.name === toolCall.function.name);
                    if (tool) {
                        const toolArgs = JSON.parse(toolCall.function.arguments);
                        const toolResult = await tool.execute(toolArgs);

                        logger.debug(toolResult, "toolResult");
                        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
                    }
                }
            }

            finishReason = response.choices[0]?.finish_reason;
            iterationCount++;
        }

        if (finishReason === "stop") {
            const finalResponse = messages.pop();
            return { role: ParticipantRole.ASSISTANT, content: [{ text: finalResponse.content }] };
        }

        return { role: ParticipantRole.ASSISTANT, content: [{ text: "Unable to get response" }] };
    }

    private getToolDefinitions() {
        return this.tools.map((tool) => tool.toolDefinition);
    }
}
