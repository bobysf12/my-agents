export abstract class Tool {
    abstract name: string;

    // Execute the tool with given arguments
    abstract execute(args: Record<string, any>): Promise<any>;
}
