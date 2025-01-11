import { Context } from "../storages/context";
import { ToolRegistry } from "../tools/tool-registry";
import { Agent } from "./agent";

export class WeatherAgent extends Agent {
    name: string = "Weather Agent";
    description: string = "An Agent that checks current weather on the given city location";

    processRequest(query: string, context: Context, tools: ToolRegistry): Promise<string> {
        return Promise.resolve("Its 30 degree celcius");
    }
}
