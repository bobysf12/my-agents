import { Context } from "../storages/context";
import { ToolRegistry } from "../tools/tool-registry";
import { Agent } from "./agent";

export class ReminderAgent extends Agent {
    name: string = "Reminder Agent";
    description: string = "An Agent that creates a Reminder based on given input";

    processRequest(query: string, context: Context, tools: ToolRegistry): Promise<string> {
        const reminders = context.get("reminders") || [];
        context.append("reminders", [...reminders, "New reminder added"]);
        return Promise.resolve("Reminder created");
    }
}
