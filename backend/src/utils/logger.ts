import pino from "pino";

export function createLogger(prefix?: string) {
  const logger = pino({
    name: prefix,
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
    redact: {
      censor: "** GDPR COMPLIANT **",
      paths: ["req.headers.authorization", "req.body.password"],
    },
  });
  return logger;
}
