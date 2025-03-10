import { OPENAI_API_KEY } from "../config/globalConfig";
import { chromium } from "playwright-extra";
import { LLMOpenAIAgent } from "./ai/agents/llm-openai-agent";
import { getHTML, getHTMLBody } from "./web-scraper-service";

// Tool to generate Instagram post from News link
// - Scrape website
// - Get content
// - Remove all ads
// - Restructure the html
// - Rerender html, beautify, custom font (family, style, color)
// - Make screenshots

// - Generate summary

export async function generateInstagramPostSlides(link: string) {
    const scrapeResult = await getHTMLBody([link], true);

    if (scrapeResult.length === 0) throw new Error("Unable to scrape website");

    const cleanHTMLResults = await cleanAndBeautifyHTML(scrapeResult[0].bodyHTML);

    // Render HTML using Playwright
    const browser = await chromium.launch();
    const page = await browser.newPage();

    for (const cleanHtml of cleanHTMLResults.pages) {
        await page.setContent(cleanHtml.html);

        // Take screenshots
        const screenshotPath = `screenshots/${Date.now()}_screenshot.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    await browser.close();
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
                    - Create an Instagram Post from the given News HTML.
                    - Remove all ads
                    - Clean up HTML
                    - Recreate the HTML to fit an Instagram Post
                    - Add styling using TailwindCSS
                </Objective>
                <OutputFormat>
                    Respond with a valid Stringify JSON without adding any other text! 
                    {
                        "source_logo": "<Logo image url of where the news came from>",
                        "source_name": "<Name of the News website>",
                        "source_url": "<Website url>",
                        "pages": [
                            {
                                "index": order number of the page,
                                "html": "<full html of the page>",
                            }
                        ]
                    }
                </OutputFormat>
            `,
        },
        model: "gpt-4o",
    });

    const result = await agent.processRequest("Here's the HTML: " + html);

    return formatJsonOutput<PostOutput>(result.content[0].text);
}
function formatJsonOutput<T>(output: string): T {
    // Use a regular expression to remove ```json and ``` from the output
    const cleanText = output.replace(/```json|```/g, "").trim();

    return JSON.parse(cleanText) as T;
}
