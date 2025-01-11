import { OPENAI_API_KEY } from "../config/globalConfig";
import Director from "../ai/director";
import { ToolRegistry } from "../ai/tools/tool-registry";
import { Classifier } from "../ai/classifiers/classifier";
import { WeatherAgent } from "../ai/agents/weather-agent";
import { ReminderAgent } from "../ai/agents/reminder-agent";
import { Context } from "../ai/storages/context";

export async function askDirector(query: string) {
    const tools = new ToolRegistry();
    const classifier = new Classifier(OPENAI_API_KEY);
    const director = new Director(tools, classifier);

    director.registerAgent(new WeatherAgent());
    director.registerAgent(new ReminderAgent());

    const response = await director.handleQuery(query, new Context());

    return response;
}
