import { ChatCompletionTool } from "openai/resources";

export abstract class Tool {
    abstract name: string;
    abstract description: string;
    abstract toolDefinition: ChatCompletionTool;

    // Execute the tool with given arguments
    abstract execute(args: Record<string, any>): Promise<any>;
}
