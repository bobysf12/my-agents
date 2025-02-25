import { tavily } from "@tavily/core";
import { MINIFLUX_BASE_URL, MINIFLUX_TOKEN, OPENAI_API_KEY, TAVILY_API_KEY } from "../config/globalConfig";
import { createLogger } from "../utils/logger";
import { LLMOpenAIAgent } from "./ai/agents/llm-openai-agent";
import { GetMinifluxEntries, GetMinifluxOriginalArticle } from "./ai/tools/minifluxTool";
import { WebScraperTool } from "./ai/tools/scraperTool";
import { TavilySearchTool } from "./ai/tools/tavilyTool";

const logger = createLogger("Service::ai-service");

const researchAgent = new LLMOpenAIAgent({
    apiKey: OPENAI_API_KEY,
    tools: [
        new GetMinifluxEntries(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
        new GetMinifluxOriginalArticle(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
        new WebScraperTool(),
    ],
    name: "Miniflux Research Agent",
    description:
        "An Agent that do Research through Miniflux by searching Articles and make Summary based on the findings",
    customSystemPrompt: {
        template: `
        <ResearchAgentPrompt>
            <Description>
                You are a content creator research assistant specialized in identifying the latest trending topics for content creation.
                Use the provided tools to search and retrieve information from Miniflux and other sources.
                When identifying topics, ensure to highlight trends and insights that are currently popular.
                You are allowed to make multiple calls (either together or in sequence) to gather the necessary information.
                Only look up information when you are sure of what you want.
                If you need to look up some information before asking a follow-up question, you are allowed to do that!
            </Description>
            <OutputFormat>
                Return your result as a JSON object in this format:
                { summary: string, sources: string[] }
                No extra keys or text, please.
            </OutputFormat>
        </ResearchAgentPrompt>
        `,
    },
    model: "gpt-4o",
});

export async function generateContent(topic: string) {
    const result = await researchAgent.processRequest(topic);

    logger.debug(result);

    return result;
}

export async function researchTopic(query: string) {
    const tavilyClient = tavily({ apiKey: TAVILY_API_KEY });
    const researchAgent = new LLMOpenAIAgent({
        apiKey: OPENAI_API_KEY,
        tools: [
            new GetMinifluxEntries(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
            new TavilySearchTool(tavilyClient),
            new GetMinifluxOriginalArticle(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
            new WebScraperTool(),
        ],
        name: "Research",
        description: "",
        customSystemPrompt: {
            template: `
                <Role>An Agent that do Research on the given query using the provided tools</Role>
                <Objective>
                    - Perform comprehensive research on given topic.
                    - Use any tools provided. You are allowed to make multiple calls (either together or in sequence) to gather the necessary information.
                    - Make summary without leaving any details.
                    - Provide keypoints
                </Objective>
                <OutputFormat>
                    Return your result as a JSON object in this format:
                    { title: string, summary: in markdown format, sources: string[] }
                    No extra keys or text, please.
                </OutputFormat>
            `,
        },
        model: "gpt-4o",
    });

    const result = await researchAgent.processRequest(query);

    const json = JSON.parse(result.content[0].text);
    return json;
}

export async function getTopicIdeas(topic: string) {
    const tavilyClient = tavily({ apiKey: TAVILY_API_KEY });
    const topicResearchAgent = new LLMOpenAIAgent({
        apiKey: OPENAI_API_KEY,
        tools: [new GetMinifluxEntries(MINIFLUX_TOKEN, MINIFLUX_BASE_URL)],
        name: "Content Creator Topic Research Agent",
        description:
            "An Agent that do Research through the given tool to find latest trending topics for making content",
        customSystemPrompt: {
            template: `
                <Role>An Agent that do Research through the given tool to find latest trending topics for making content</Role>
                <ResearchAgentPrompt>
                    <Description>
                        You are a research assistant. Your job is to find Trending news or topics related to Tech.
                        When summarizing, ensure to highlight key points and insights from the articles.
                        You are allowed to make multiple calls (either together or in sequence) to gather the necessary information.
                        Only look up information when you are sure of what you want.
                    </Description>
                    <OutputFormat>
                        Return your result as a JSON object in this format:
                        { results: { title: string, description: string, sources: string[] }[] }
                        Do not add any extra text or format type of the output!
                    </OutputFormat>
                </ResearchAgentPrompt>
            `,
        },
        model: "gpt-4o",
    });

    const result = await topicResearchAgent.processRequest(
        `Get trending topics about ${topic} for this week. Current timestamp is: ${Date.now()}`,
    );

    const json = JSON.parse(result.content[0].text);

    return json;
}

export async function getMinifluxTrendingTopics(query?: string) {
    const topicResearchAgent = new LLMOpenAIAgent({
        apiKey: OPENAI_API_KEY,
        tools: [
            new GetMinifluxEntries(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
            new GetMinifluxOriginalArticle(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
        ],
        name: "",
        description: "",
        customSystemPrompt: {
            template: `
                <Role>Miniflux Feed trend and categorizers</Role>
                <Objective>
                    You are a research assistant. Your job is to list down most mentioned topics from the given feeds, group them, categorize it, and rank them.
                    You are allowed to make multiple calls (either together or in sequence) to gather the necessary information.
                    Only look up information when you are sure of what you want.
                </Objective>
                <Categories>
                    - 'software_development'
                    - 'global_news'
                    - 'politics'
                    - 'tech_news'
                    - 'others'
                </Categories>
                <OutputFormat>
                    Use this format for the final response:
                    Respond **only** with a pure JSON object, without escaping characters, extra whitespace, or additional text.
                    {
                        "results": [
                            {
                                "title": "<title of the topic>",
                                "description": "<detailed description about the topic>",
                                "sources": ["<links>"],
                                "category": "string",
                                "rank": "number"
                            }
                        ]
                    }
                </OutputFormat>
            `,
        },
        model: "gpt-4o-mini",
    });

    const result = await topicResearchAgent.processRequest(`${query}. Current timestamp is: ${Date.now()}`);

    const json = JSON.parse(result.content[0].text);

    return json;
}
