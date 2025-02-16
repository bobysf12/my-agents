import { MINIFLUX_BASE_URL, MINIFLUX_TOKEN, OPENAI_API_KEY } from "../config/globalConfig";
import { createLogger } from "../utils/logger";
import { LLMOpenAIAgent } from "./ai/agents/llm-openai-agent";
import { GetMinifluxEntries, GetMinifluxOriginalArticle } from "./ai/tools/minifluxTool";
import { WebScraperTool } from "./ai/tools/scraperTool";

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

const topicResearchAgent = new LLMOpenAIAgent({
    apiKey: OPENAI_API_KEY,
    tools: [
        new GetMinifluxEntries(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
        new GetMinifluxOriginalArticle(MINIFLUX_TOKEN, MINIFLUX_BASE_URL),
        new WebScraperTool(),
    ],
    name: "Content Creator Topic Research Agent",
    description: "An Agent that do Research through the given tool to find latest trending topics for making content",
    customSystemPrompt: {
        template: `
        <ResearchAgentPrompt>
            <Description>
                You are a research assistant specialized in using Miniflux to search for articles and create summaries based on your findings.
                Use the provided tools to search and retrieve articles from Miniflux.
                When summarizing, ensure to highlight key points and insights from the articles.
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

export async function getTopicIdeas() {
    const result = await topicResearchAgent.processRequest(
        `Get trending topics for this week. Current timestamp is: ${Date.now()}`,
    );

    return result;
}
