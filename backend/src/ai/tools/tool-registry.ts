import { Tool } from "./tool";

export class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    registerTool(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }
}
