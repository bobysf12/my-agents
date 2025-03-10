import { tavily } from "@tavily/core";
import { MINIFLUX_BASE_URL, MINIFLUX_TOKEN, OPENAI_API_KEY, TAVILY_API_KEY } from "../config/globalConfig";
import { createLogger } from "../utils/logger";
import { LLMOpenAIAgent } from "./ai/agents/llm-openai-agent";
import { GetMinifluxEntries, GetMinifluxOriginalArticle } from "./ai/tools/minifluxTool";
import { WebScraperTool } from "./ai/tools/scraperTool";
import { TavilySearchTool } from "./ai/tools/tavilyTool";
import { deepScrapeWebsite, getHTML, getHTMLBody } from "./web-scraper-service";
import { chromium } from "playwright-extra";

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

    const result = await researchAgent.processRequest(`${query}. Current Unix Timestamp: ${Date.now()}`);

    const json = formatJsonOutput<{ title: string; summary: string; sources: string[] }>(result.content[0].text);
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

// Tool to generate Instagram post from News link
// - Scrape website
// - Get content
// - Remove all ads
// - Restructure the html
// - Rerender html, beautify, custom font (family, style, color)
// - Make screenshots

// - Generate summary

export async function generateInstagramPostSlides(link: string) {
    const scrapeResult = await deepScrapeWebsite(link, { maxUrls: 1, transformToMarkdown: true, headless: true });

    if (scrapeResult.length === 0 || scrapeResult[0].error) throw new Error("Unable to scrape website");

    logger.info(scrapeResult, "Scraper result");

    const cleanHTMLResults = await cleanAndBeautifyHTML(scrapeResult[0].result);

    // Render HTML using Playwright
    const browser = await chromium.launch();

    for (const cleanHtml of cleanHTMLResults.pages) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1080, height: 1080 });
        await page.setContent(cleanHtml.html);

        // Take screenshots
        const screenshotPath = `screenshots/${Date.now()}_screenshot.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    await browser.close();

    return cleanHTMLResults;
}

interface Page {
    index: number; // Order number of the page
    html: string; // Full HTML of the page
}

interface PostOutput {
    source_logo: string; // Logo image URL of where the news came from
    source_name: string; // Name of the news website
    source_url: string; // Website URL
    pages: Page[]; // Array of pages
}
async function cleanAndBeautifyHTML(html: string) {
    // Ask LLM to clean ads, recreate html, and add styling using tailwindcss. Keep images intact
    // - News source logo
    // - News source name
    // - News source url
    // - Pages
    //  - index
    //  - content html
    //  - featured image
    // - Caption

    const agent = new LLMOpenAIAgent({
        apiKey: OPENAI_API_KEY,
        tools: [],
        name: "Agent",
        description: "",
        customSystemPrompt: {
            template: `
<Role>You are an Instagram Creator Assistant</Role>

<Objective>
    - Create an engaging and visually appealing Instagram post from the given narrative that I will provide you.
    - Use the same language as the news content to maintain consistency and authenticity.  
    - Your target audience are Gen-Z, so translate the content make sense for them
    - Use Indonesian language. Casual and Informal. Don't over do it. Don't include too many emojis.
</Objective>

<slide1>
    <description>Create a bold, attention-grabbing Instagram slide that introduces the topic in a short sentence.</description>
    <Styling>
        - Use the OpenSans font family.  
        - Use a very large high-contrast text
        - If available, overlay the featured image as the background.
        - Put the title in a white box centered at the middle bottom.
        - Ensure the page fills in the entire 1080x1080.
    </Styling>
</slide1>

<slide2>
    <description>Create a clean and minimal slide that summarizes the key takeaways from the news.</description>
    <guidelines>
        <guideline>Use bullet points or a list format (max 3–4 points), but in the middle of the page.</guideline>
        <guideline>Include a small footer text at the bottom to read more details in the caption</guideline>
    </guidelines>
    <Styling>
        - Use the OpenSans font family.  
        - Use very large high-contrast text
        - Ensure the page fills in the entire 1080x1080.
        - Put the bullet points at the center of the page
    </Styling>
</slide2>

<caption>
    <description>Write a casual but informative Instagram caption based on the news content.</description>
    <guidelines>
        <guideline>Start with a short, engaging hook to grab attention.</guideline>
        <guideline>Provide the full details of the content. Make it short without leaving any important details.</guideline>
        <guideline>Add a professional insight or personal experience (optional).</guideline>
        <guideline>End with a call to action (CTA) encouraging comments, shares, or saves.</guideline>
    </guidelines>
</caption>


<OutputFormat>
    Respond with a valid Stringify JSON without adding any other text!  
    {
        "pages": [
            {
                "index": 1,
                "html": "<HTML content for slide 1>"
            },
            {
                "index": 2,
                "html": "<HTML content for slide 2>"
            },
            {
                "index": 3,
                "html": "<HTML content for slide 3>"
            }
        ],
        "caption": "<Complete caption of the news>"
    }
</OutputFormat>
`,
        },
        model: "gpt-4o-mini",
    });

    const result = await agent.processRequest("Content narrative: " + html);

    return formatJsonOutput<PostOutput>(result.content[0].text);
}
function formatJsonOutput<T>(output: string): T {
    // Use a regular expression to remove ```json and ``` from the output
    const cleanText = output.replace(/```json|```/g, "").trim();

    return JSON.parse(cleanText) as T;
}
