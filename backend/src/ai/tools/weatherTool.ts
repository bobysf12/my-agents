import { ChatCompletionTool } from "openai/resources";
import { Tool } from "./tool";

export class GetWeatherLocationTool extends Tool {
    name = "GetWeatherLocationTool";
    description: string = "Get weather location based on the given city";
    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "The name of the city to get the weather location for",
                    },
                },
                required: ["city"],
                additionalProperties: false,
            },
            strict: true,
        },
    };

    private apiKey: string;

    constructor(apiKey: string) {
        super();
        this.apiKey = apiKey;
    }

    async execute(args: Record<string, any>) {
        const { city } = args;
        return await this.fetchLocation(city);
    }

    private async fetchLocation(city: string) {
        try {
            const response = await fetch(
                `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${this.apiKey}`,
            );
            if (!response.ok) {
                throw new Error(`Error fetching location: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            throw new Error("Failed to fetch location data.");
        }
    }
}

export class GetWeatherDataTool extends Tool {
    name = "GetWeatherDataTool";
    description: string = "Get weather data based on the given latitude and longitude";
    toolDefinition: ChatCompletionTool = {
        type: "function",
        function: {
            name: this.name,
            description: this.description,
            parameters: {
                type: "object",
                properties: {
                    lat: {
                        type: "number",
                        description: "The latitude of the location",
                    },
                    lon: {
                        type: "number",
                        description: "The longitude of the location",
                    },
                },
                required: ["lat", "lon"],
                additionalProperties: false,
            },
            strict: true,
        },
    };

    private apiKey: string;

    constructor(apiKey: string) {
        super();
        this.apiKey = apiKey;
    }

    async execute(args: Record<string, any>) {
        const { lat, lon } = args;
        return await this.fetchWeatherData(lat, lon);
    }

    private async fetchWeatherData(lat: number, lon: number) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`,
            );
            if (!response.ok) {
                throw new Error(`Error fetching weather data: ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(error);
            throw new Error("Failed to fetch weather data.");
        }
    }
}
