import { Command } from "commander";
import { OPENAI_API_KEY } from "../../config/globalConfig";
import { createLogger } from "../../utils/logger";
import { LLMOpenAIAgent } from "./agents/llm-openai-agent";
import { Classifier } from "./classifiers/classifier";
import Director from "./director";
import { JsonStorage } from "./storages/json-storage";
import { GetWeatherDataTool, GetWeatherLocationTool } from "./tools/weatherTool";
import { WebScraperTool } from "./tools/scraperTool";
import {
    GmailApplyLabelTool,
    GmailCreateLabelsTool,
    GmailDeleteMessagesTool,
    GmailGetLabelsTool,
    GmailReadMessagesTool,
} from "./tools/gmailTool";

const logger = createLogger("ai-service");

const getWeatherLocationTool = new GetWeatherLocationTool("aa5e383284fda712b228fb4170cf433a");
const getWeatherDataTool = new GetWeatherDataTool("aa5e383284fda712b228fb4170cf433a");
const webscraperTool = new WebScraperTool();

export async function askDirector(query: string, userId: string, sessionId: string) {
    const jsonStorage = new JsonStorage("storages/json/" + userId + "-" + sessionId + ".json");

    const classifier = new Classifier(OPENAI_API_KEY);
    const director = new Director({ classifier, storage: jsonStorage, logger });

    director.registerAgent(
        new LLMOpenAIAgent({
            tools: [getWeatherLocationTool, getWeatherDataTool],
            model: "gpt-4o-mini",
            apiKey: OPENAI_API_KEY,
            name: "Weather Agent",
            description: "An Agent that checks current weather on the given city location",
            customSystemPrompt: {
                template: `You are a helpful assistant. Your job is to get current weather and give me summary of the weather in one sentence. Also suggests me the activity recommendation for the day`,
            },
        }),
    );

    director.registerAgent(
        new LLMOpenAIAgent({
            tools: [webscraperTool],
            model: "gpt-4o-mini",
            apiKey: OPENAI_API_KEY,
            name: "Hotel price agent",
            description: "An Agent that goes through the given hotel link and check the price",
        }),
    );

    director.registerAgent(
        new LLMOpenAIAgent({
            tools: [webscraperTool],
            model: "gpt-4o-mini",
            apiKey: OPENAI_API_KEY,
            name: "Website Summarizer",
            description: "An Agent that goes through the given website url, summarizes the website content",
        }),
    );

    const currentDate = new Date().toLocaleDateString("en-GB").split("/").reverse().join("-");

    director.registerAgent(
        new LLMOpenAIAgent({
            tools: [webscraperTool],
            model: "gpt-4o-mini",
            apiKey: OPENAI_API_KEY,
            name: "E-Commerce Agent",
            description:
                "An Agent that goes through E-Commerce sites, find the most trusted, cheap, and reviewed items, list all the links down, then open the links one by one to get more details of the product, and make a summary out of the found items",
            customSystemPrompt: {
                template: `You are a smart product search agent. Use https://tokopedia.com/search?q=<item name> and https://shopee.co.id/search?keyword=<item name> to search for items. Use the tools to look up information.
    You are allowed to make multiple calls (either together or in sequence).
    Only look up information when you are sure of what you want.
    The current year is ${currentDate}.
    If you need to look up some information before asking a follow up question, you are allowed to do that!
    I want to have in your output links to product details (if possible). And I want you to give me a summary recommendation of which product should I buy`,
            },
        }),
    );

    director.registerAgent(
        new LLMOpenAIAgent({
            tools: [webscraperTool],
            model: "gpt-4o-mini",
            apiKey: OPENAI_API_KEY,
            name: "Travel Agent",
            description:
                "An Travel Agent that goes through traveloka.com or tiket.com to find hotels based on the given location",
            customSystemPrompt: {
                template: `You are a smart travel agency. Use the tools to look up information.
    You are allowed to make multiple calls (either together or in sequence).
    Only look up information when you are sure of what you want.
    The current year is ${currentDate}.
    If you need to look up some information before asking a follow up question, you are allowed to do that!
    I want to have in your output links to hotels websites and flights websites (if possible).
    I want to have as well the logo of the hotel and the logo of the airline company (if possible).
    In your output always include the price of the flight and the price of the hotel and the currency as well (if possible).
    for example for hotels-
    Rate: $581 per night
    Total: $3,488`,
            },
        }),
    );

    director.registerAgent(
        new LLMOpenAIAgent({
            tools: [
                new GmailReadMessagesTool(),
                new GmailDeleteMessagesTool(),
                new GmailCreateLabelsTool(),
                new GmailGetLabelsTool(),
                new GmailApplyLabelTool(),
            ],
            model: "gpt-4o",
            apiKey: OPENAI_API_KEY,
            name: "Gmail Agent",
            description: "An Agent that manage (Read, Delete, Apply Labels) of my gmail inbox.",
            customSystemPrompt: {
                template: `You are a gmail assistant. Your job is to manage email, including read, delete, or apply labels. 
    Use the provided tools to look up information.
    When reading the email, make sure to always mention the id so that you can use it for later actions (e.g Delete or Apply labels)
    You are allowed to make multiple calls (either together or in sequence).
    Only look up information when you are sure of what you want.
    The current year is ${currentDate}.
    If you need to look up some information before asking a follow up question, you are allowed to do that!`,
            },
        }),
    );
    // What's the weather today in Jakarta?
    const response = await director.handleQuery(query, userId, sessionId);

    return response;
}

const program = new Command();
//
program.name("AI Agents").argument("<string>", "Query");
program.parse();

const query = program.args[0];
const userId = "defaultUserId"; // Replace with actual user ID logic
const sessionId = "newsession4"; // Replace with actual session ID logic

askDirector(query, userId, sessionId)
    .then((response) => {
        console.log(response);
    })
    .catch((error) => {
        console.error("Error:", error);
    });
