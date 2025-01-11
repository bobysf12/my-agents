import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ZodError } from "zod";
import pinoHttp from "pino-http";
import authRouter from "./routes/auth-route";
import aiRouter from "./routes/ai-route";
import { createLogger } from "./utils/logger";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(
    pinoHttp({
        logger: createLogger(),
        serializers: {
            req(req) {
                req.body = req.raw.body;
                return req;
            },
        },
    }),
);

app.get("/", (req: express.Request, res: express.Response) => {
    res.send("Hello World");
});

// Routes
app.use("/auth", authRouter);
app.use("/agents", aiRouter);

// Error Handling Middleware (optional)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Handle zod errors
    if (err instanceof ZodError) {
        res.status(400).json({ errors: err.errors });
    } else {
        res.status(err.status || 500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    createLogger().debug(`Server running on http://localhost:${PORT}`);
});
