import { getGmailClient } from "./gmailAuth";
import { ChatCompletionTool } from "openai/resources";
import { Tool } from "./tool";

export class GmailReadMessagesTool extends Tool {
    name = "GmailCategorizerTool";
    description = "Fetch unread Gmail messages";

    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    searchQuery: {
                        type: "string",
                        description: "Gmail search query, e.g. 'is:unread label:INBOX'.",
                    },
                    maxResults: {
                        type: "number",
                        description: "Max number of messages to fetch. Defaults to 100.",
                    },
                },
                required: [],
            },
        },
    };

    constructor() {
        super();
    }

    async execute(args: Record<string, any>) {
        const { searchQuery = "is:unread", maxResults = 100 } = args;

        try {
            // Get authorized Gmail client
            const gmail = await getGmailClient();

            // 1. List messages
            const listRes = await gmail.users.messages.list({
                userId: "me",
                q: searchQuery, // e.g., "is:unread"
                maxResults,
            });

            const messages = listRes.data.messages || [];
            if (!messages.length) {
                return JSON.stringify({
                    messageCount: 0,
                    results: [],
                });
            }

            const results = [];
            for (const msg of messages) {
                // 2. Get full message
                const messageRes = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "full",
                });

                const { payload, snippet } = messageRes.data;
                const headers = payload?.headers || [];

                // Extract subject, from, date
                let subject = "";
                let from = "";
                let date = "";
                headers.forEach((header) => {
                    if (header.name === "Subject") subject = header.value || "";
                    if (header.name === "From") from = header.value || "";
                    if (header.name === "Date") date = header.value || "";
                });

                // 4. Push result
                results.push({
                    id: msg.id,
                    subject,
                    from,
                    date,
                    snippet,
                });
            }

            // Return a structured JSON
            return JSON.stringify({
                messageCount: results.length,
                results,
            });
        } catch (err: any) {
            console.error("GmailCategorizerTool error:", err);
            throw err;
        }
    }
}

export class GmailDeleteMessagesTool extends Tool {
    name = "GmailDeleteMessages";
    description = "Delete Gmail messages";

    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    ids: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        description: "Array of message IDs to delete",
                    },
                },
                required: [],
            },
        },
    };

    constructor() {
        super();
    }

    async execute(args: Record<string, any>) {
        const { ids } = args;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error("Invalid 'ids' parameter. It must be a non-empty array of message IDs.");
        }

        try {
            // Get authorized Gmail client
            const gmail = await getGmailClient();

            await gmail.users.messages.batchDelete({
                userId: "me",
                requestBody: { ids },
            });
            return JSON.stringify({
                message: "Success",
            });
        } catch (err: any) {
            console.error("GmailDeleteMessagesTool error:", err);
            return JSON.stringify({
                message: "Error",
                error: err.message || "An unknown error occurred",
            });
        }
    }
}

export class GmailApplyLabelTool extends Tool {
    name = "GmailApplyLabelTool";
    description = "Apply label to Gmail messages";

    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    ids: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        description: "Array of message IDs to be labeled",
                    },
                    labelId: { type: "string", description: "Label Id" },
                },
                required: [],
            },
        },
    };

    constructor() {
        super();
    }

    async execute(args: Record<string, any>) {
        const { ids, labelId } = args;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error("Invalid 'ids' parameter. It must be a non-empty array of message IDs.");
        }

        try {
            // Get authorized Gmail client
            const gmail = await getGmailClient();

            await gmail.users.messages.batchModify({
                userId: "me",
                requestBody: { ids, addLabelIds: [labelId] },
            });
            return JSON.stringify({
                message: "Success",
            });
        } catch (err: any) {
            console.error("GmailApplyLabelTool error:", err);
            return JSON.stringify({
                message: "Error",
                error: err.message || "An unknown error occurred",
            });
        }
    }
}

export class GmailCreateLabelsTool extends Tool {
    name = "GmailCreateLabelsTool";
    description = "Create new labels in my Gmail";

    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    label: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                description: "The display name of the label",
                            },
                            labelListVisibility: {
                                type: "string",
                                enum: ["labelShow", "labelShowIfUnread", "labelHide"],
                                description: "The visibility of the label in the label list in the Gmail web interface",
                            },
                            messageListVisibility: {
                                type: "string",
                                enum: ["show", "hide"],
                                description:
                                    "The visibility of messages with this label in the message list in the Gmail web interface",
                            },
                            textColor: {
                                type: "string",
                                description:
                                    "The text color of the label in hexadecimal format, e.g., '#000000' for black",
                            },
                            backgroundColor: {
                                type: "string",
                                description:
                                    "The background color of the label in hexadecimal format, e.g., '#FFFFFF' for white",
                            },
                        },
                        required: ["name"],
                    },
                },
                required: [],
            },
        },
    };

    constructor() {
        super();
    }

    async execute(args: Record<string, any>) {
        const { label } = args;

        if (!label || !label.name) {
            throw new Error("Invalid 'label' parameter. 'name' is required.");
        }

        try {
            // Get authorized Gmail client
            const gmail = await getGmailClient();

            // Create the label
            const newLabel = await gmail.users.labels.create({
                userId: "me",
                requestBody: {
                    name: label.name,
                    labelListVisibility: label.labelListVisibility,
                    messageListVisibility: label.messageListVisibility,
                    color: {
                        textColor: label.textColor,
                        backgroundColor: label.backgroundColor,
                    },
                },
            });

            return JSON.stringify({
                message: "Label created successfully",
                label: newLabel.data,
            });
        } catch (err: any) {
            return JSON.stringify({
                message: "Error",
                error: err.message || "An unknown error occurred",
            });
        }
    }
}
export class GmailGetLabelsTool extends Tool {
    name = "GmailGetLabelsTool";
    description = "Retrieve all labels in my Gmail";

    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {},
        },
    };

    constructor() {
        super();
    }

    async execute() {
        try {
            // Get authorized Gmail client
            const gmail = await getGmailClient();

            const labels = await gmail.users.labels.list({ userId: "me" });
            return JSON.stringify({
                labels,
            });
        } catch (err: any) {
            return JSON.stringify({
                message: "Error",
                error: err.message || "An unknown error occurred",
            });
        }
    }
}
