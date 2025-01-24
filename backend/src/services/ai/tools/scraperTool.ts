import { ChatCompletionTool } from "openai/resources";
import { convert } from "html-to-text";
import { Tool } from "./tool";
import { getHTMLBody } from "../../web-scraper-service";

export class WebScraperTool extends Tool {
    name = "WebScraperTool";
    description: string = "Get HTML body of the given url";
    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "URL of the website that is going to be scraped.",
                    },
                },
                required: ["url"],
                additionalProperties: false,
            },
            strict: true,
        },
    };

    constructor() {
        super();
    }

    async execute(args: Record<string, any>) {
        const { url } = args;

        const results = await getHTMLBody([url], true);

        return convert(results[0].bodyHTML);
    }
}
