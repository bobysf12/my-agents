import { Command } from "commander";
import { OPENAI_API_KEY } from "../config/globalConfig";
import { createLogger } from "../utils/logger";
import { LLMOpenAIAgent } from "./agents/llm-openai-agent";
import { Classifier } from "./classifiers/classifier";
import Director from "./director";
import { InMemoryChatStorage } from "./storages/in-memory-storage";
import { GetWeatherDataTool, GetWeatherLocationTool } from "./tools/weatherTool";

const logger = createLogger("ai-service");

const getWeatherLocationTool = new GetWeatherLocationTool("aa5e383284fda712b228fb4170cf433a");
const getWeatherDataTool = new GetWeatherDataTool("aa5e383284fda712b228fb4170cf433a");

const classifier = new Classifier(OPENAI_API_KEY);
const director = new Director({ classifier, storage: new InMemoryChatStorage(), logger });

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
        tools: [],
        model: "gpt-4o-mini",
        apiKey: OPENAI_API_KEY,
        name: "Travel Agent",
        description: "An Agent that respond to all Travel inquiries",
    }),
);

export async function askDirector(query: string, userId: string, sessionId: string) {
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
const sessionId = "defaultSessionId"; // Replace with actual session ID logic

askDirector(query, userId, sessionId)
    .then((response) => {
        console.log(response);
    })
    .catch((error) => {
        console.error("Error:", error);
    });
