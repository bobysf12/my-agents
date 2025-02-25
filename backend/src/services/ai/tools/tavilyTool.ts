import { ChatCompletionTool } from "openai/resources";
import { TavilyClient } from "@tavily/core";
import { Tool } from "./tool";

export class TavilySearchTool extends Tool {
    name = "TavilySearchTool";
    description: string =
        "A tool for performing searches using the Tavily client, allowing for various options such as search depth, topic, and time range.";
    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query string.",
                    },
                    options: {
                        type: "object",
                        properties: {
                            searchDepth: {
                                type: "string",
                                enum: ["basic", "advanced"],
                                description: "The depth of the search, either 'basic' or 'advanced'.",
                            },
                            topic: {
                                type: "string",
                                enum: ["general", "news", "finance"],
                                description: "The topic of the search, such as 'general', 'news', or 'finance'.",
                            },
                            days: {
                                type: "number",
                                description: "The number of days to look back for search results.",
                            },
                            maxResults: {
                                type: "number",
                                description: "The maximum number of search results to return.",
                            },
                            includeImages: {
                                type: "boolean",
                                description: "Whether to include images in the search results.",
                            },
                            includeImageDescriptions: {
                                type: "boolean",
                                description: "Whether to include descriptions of images in the search results.",
                            },
                            includeAnswer: {
                                type: "boolean",
                                description: "Whether to include a direct answer in the search results.",
                            },
                            includeRawContent: {
                                type: "boolean",
                                description: "Whether to include raw content in the search results.",
                            },
                            includeDomains: {
                                type: "array",
                                items: { type: "string" },
                                description: "A list of domains to include in the search.",
                            },
                            excludeDomains: {
                                type: "array",
                                items: { type: "string" },
                                description: "A list of domains to exclude from the search.",
                            },
                            maxTokens: {
                                type: "number",
                                description: "The maximum number of tokens to use in the search.",
                            },
                            timeRange: {
                                type: "string",
                                enum: ["year", "month", "week", "day", "y", "m", "w", "d"],
                                description:
                                    "The time range for the search, such as 'year', 'month', 'week', or 'day'.",
                            },
                        },
                        required: [],
                        additionalProperties: false,
                    },
                },
                required: ["query"],
                additionalProperties: false,
            },
        },
    };

    private client: TavilyClient;
    constructor(client: TavilyClient) {
        super();
        this.client = client;
    }

    async execute(args: Record<string, any>) {
        const { url, options } = args;

        const result = await this.client.search(url, {});

        return result;
    }
}
