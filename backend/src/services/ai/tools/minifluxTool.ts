import { ChatCompletionTool } from "openai/resources";
import TurndownService from "turndown";
import { Tool } from "./tool";
import axios from "axios";
import { createLogger } from "../../../utils/logger";
import { htmlToText } from "html-to-text";

const logger = createLogger("Tools::Miniflux-Tool");

function getHeaders(token: string) {
    return {
        headers: {
            "X-Auth-Token": token,
        },
    };
}

function parseEntry(entry: any, includeContent: boolean = false) {
    const turndown = new TurndownService();
    const content = turndown.turndown(entry.content);
    return {
        id: entry.id,
        feed_id: entry.feed_id,
        title: entry.title,
        url: entry.url,
        published_at: entry.published_at,
        content: includeContent ? content : undefined,
    };
}

export class GetMinifluxEntries extends Tool {
    name = "GetMinifluxEntries";
    description: string = "Get All Feed entries from Miniflux";
    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Search for article title",
                    },
                    before: {
                        type: "number",
                        description: "start date unix timestamp (seconds)",
                    },
                    after: {
                        type: "number",
                        description: "end date unix timestamp (seconds)",
                    },
                },
                required: [],
                additionalProperties: false,
            },
        },
    };

    private token: string;
    private baseUrl: string;

    constructor(token: string, baseUrl: string) {
        super();
        this.token = token;
        this.baseUrl = baseUrl;

        logger.debug({ token, baseUrl }, this.name + " initialized");
    }

    async execute(args: Record<string, any> = {}) {
        return this.getFeeds(args.query, args.before, args.after);
    }

    private async getFeeds(query?: string, before?: number, after?: number) {
        const searchParams = new URLSearchParams();
        if (query) searchParams.set("search", query);
        if (before) searchParams.set("before", before.toString());
        if (after) searchParams.set("after", after.toString());
        // searchParams.set("limit", "20");

        const url = this.baseUrl + "/v1/entries?" + searchParams.toString();

        logger.debug(url, "Searching entries");

        const result = await axios.get(url, getHeaders(this.token));
        logger.debug(result.data, "Fetch result");

        const entries = result.data.entries;

        return entries.map(parseEntry);
    }
}

export class GetMinifluxOriginalArticle extends Tool {
    name = "GetMinifluxOriginalArticle";
    description: string = "Fetch Original Article from Miniflux";
    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    entryId: {
                        type: "string",
                        description: "Entry id of the feed",
                    },
                },
                required: ["entryId"],
                additionalProperties: false,
            },
            strict: true,
        },
    };

    private token: string;
    private baseUrl: string;

    constructor(token: string, baseUrl: string) {
        super();
        this.token = token;
        this.baseUrl = baseUrl;
        logger.debug({ token, baseUrl }, this.name + " initialized");
    }

    async execute(args: Record<string, any>) {
        return this.fetchOriginalContent(args.entryId);
    }

    private async fetchOriginalContent(entryId: string) {
        const result = await axios.get(
            this.baseUrl + "/v1/entries/" + entryId + "/fetch-content",
            getHeaders(this.token),
        );

        return parseEntry(result.data, true);
    }
}
