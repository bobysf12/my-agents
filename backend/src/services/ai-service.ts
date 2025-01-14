import { OPENAI_API_KEY } from "../config/globalConfig";
import Director from "../ai/director";
import { Classifier } from "../ai/classifiers/classifier";
import { WeatherAgent } from "../ai/agents/weather-agent";
import { ReminderAgent } from "../ai/agents/reminder-agent";
import { InMemoryChatStorage } from "../ai/storages/in-memory-storage";
import { EcommerceAgent } from "../ai/agents/ecommerce-agent";
import { createLogger } from "../utils/logger";

const logger = createLogger("ai-service");
const classifier = new Classifier(OPENAI_API_KEY);
const director = new Director({ classifier, storage: new InMemoryChatStorage(), logger });

director.registerAgent(new WeatherAgent());
director.registerAgent(new ReminderAgent());
director.registerAgent(new EcommerceAgent());

export async function askDirector(query: string, userId: string, sessionId: string) {
    // What's the weather today in Jakarta?
    const response = await director.handleQuery(query, userId, sessionId);

    return response;
}
