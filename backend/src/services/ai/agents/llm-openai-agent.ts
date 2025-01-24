import OpenAI from "openai";
import { Tool } from "../tools/tool";
import { ConversationMessage, ParticipantRole, TemplateVariables } from "../types/common";
import { Agent, AgentOptions } from "./agent";
import { ChatCompletionMessageParam } from "openai/resources";

type LLMOpenAIAgentOptions = {
    tools: Tool[];
    apiKey: string;
    customSystemPrompt?: {
        template: string;
        variables?: TemplateVariables;
    };
    model: string;
} & AgentOptions;

export class LLMOpenAIAgent extends Agent {
    private openai: OpenAI;
    private model: string;

    private promptTemplate: string;
    private systemPrompt: string;
    private customVariables: TemplateVariables;

    private useTools: boolean;

    constructor(options: LLMOpenAIAgentOptions) {
        super(options);
        this.openai = new OpenAI({ apiKey: options.apiKey });

        this.promptTemplate = `You are a ${this.name}. ${this.description} Provide helpful and accurate information based on your expertise.
          You will engage in an open-ended conversation, providing helpful and accurate information based on your expertise.
          The conversation will proceed as follows:
          - The human may ask an initial question or provide a prompt on any topic.
          - You will provide a relevant and informative response.
          - The human may then follow up with additional questions or prompts related to your previous response, allowing for a multi-turn dialogue on that topic.
          - Or, the human may switch to a completely new and unrelated topic at any point.
          - You will seamlessly shift your focus to the new topic, providing thoughtful and coherent responses based on your broad knowledge base.
          Throughout the conversation, you should aim to:
          - Understand the context and intent behind each new question or prompt.
          - Provide substantive and well-reasoned responses that directly address the query.
          - Draw insights and connections from your extensive knowledge when appropriate.
          - Ask for clarification if any part of the question or prompt is ambiguous.
          - Maintain a consistent, respectful, and engaging tone tailored to the human's communication style.
          - Seamlessly transition between topics as the human introduces new subjects.`;

        if (options.customSystemPrompt) {
            this.setSystemPrompt(options.customSystemPrompt.template, options.customSystemPrompt.variables);
        }

        this.useTools = options.tools?.length > 0;

        this.model = options.model;
    }

    async processRequest(query: string, chatHistory: ConversationMessage[] = []): Promise<ConversationMessage> {
        this.log.info(`Processing request: ${query}`);
        this.updateSystemPrompt();
        const messages: ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: this.systemPrompt,
            },
            ...chatHistory.map((msg) => ({ role: msg.role, content: msg.content[0].text || "" })),
            { role: "user", content: query },
        ];

        let iterationCount = 0;
        let finishReason = "";

        do {
            this.log.info(`Sending request to OpenAI API with model: ${this.model}`);
            // Send a request to the OpenAI API for a chat completion
            const response = await this.openai.chat.completions.create({
                tools: this.useTools ? this.getToolDefinitions() : undefined,
                tool_choice: this.useTools ? "auto" : undefined,
                model: this.model,
                messages,
            });

            this.log.info(`Received response from OpenAI API: ${JSON.stringify(response.choices[0].message)}`);
            // Add the assistant's message to the conversation history
            messages.push(response.choices[0].message);

            // Check if there are any tool calls in the assistant's message
            const toolCalls = response.choices[0]?.message?.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
                this.log.info(`Tool calls detected: ${JSON.stringify(toolCalls)}`);
                // Iterate through each tool call
                for (const toolCall of toolCalls) {
                    // Find the corresponding tool based on the tool call name
                    const tool = this.tools.find((t) => t.name === toolCall.function.name);
                    if (tool) {
                        // Parse the arguments for the tool call
                        const toolArgs = JSON.parse(toolCall.function.arguments);
                        this.log.info(`Executing tool: ${tool.name} with arguments: ${JSON.stringify(toolArgs)}`);
                        // Execute the tool with the parsed arguments
                        const toolResult = await tool.execute(toolArgs);

                        // Add the tool's result to the conversation history
                        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
                    } else {
                        return { role: ParticipantRole.ASSISTANT, content: [{ text: "No tool found" }] };
                    }
                }
            }

            // Check the finish reason for the response
            finishReason = response.choices[0]?.finish_reason;
            iterationCount++;
        } while (iterationCount < 5 && finishReason !== "stop");

        if (finishReason === "stop") {
            const finalResponse = messages.pop();
            return { role: ParticipantRole.ASSISTANT, content: [{ text: finalResponse.content }] };
        }

        this.log.info("Unable to get a valid response after multiple attempts.");
        return { role: ParticipantRole.ASSISTANT, content: [{ text: "Unable to get response" }] };
    }

    private getToolDefinitions() {
        return this.tools.map((tool) => tool.toolDefinition);
    }

    private setSystemPrompt(template?: string, variables?: TemplateVariables): void {
        if (template) {
            this.promptTemplate = template;
        }

        if (variables) {
            this.customVariables = variables;
        }

        this.updateSystemPrompt();
    }

    private updateSystemPrompt(): void {
        const allVariables: TemplateVariables = {
            ...this.customVariables,
        };

        this.systemPrompt = this.replaceplaceholders(this.promptTemplate, allVariables);
    }

    private replaceplaceholders(template: string, variables: TemplateVariables): string {
        return template.replace(/{{(\w+)}}/g, (match, key) => {
            if (key in variables) {
                const value = variables[key];
                if (Array.isArray(value)) {
                    return value.join("\n");
                }
                return value;
            }
            return match; // If no replacement found, leave the placeholder as is
        });
    }
}
