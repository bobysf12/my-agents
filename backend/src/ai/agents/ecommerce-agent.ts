import { Context } from "../storages/context";
import { ToolRegistry } from "../tools/tool-registry";
import { Agent } from "./agent";

export class EcommerceAgent extends Agent {
    name: string = "Ecommerce Agent";
    description: string = "An Agent that goes to the web and find the cheapest price of the given item name";

    processRequest(query: string, context: Context, tools: ToolRegistry): Promise<string> {
        const reminders = context.get("reminders") || [];
        context.append("reminders", [...reminders, "New reminder added"]);
        return Promise.resolve("Reminder created");
    }
}
