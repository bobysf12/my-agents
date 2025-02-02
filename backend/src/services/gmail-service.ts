import fs from "fs";
import path from "path";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

/**
 * Returns a Gmail API client authorized with OAuth2.
 */
export async function getGmailClient() {
    // 1. Load client secrets
    const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
    const credentials = JSON.parse(content);
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0], // e.g., http://127.0.0.1:3000 or for copy/paste flows
    );

    // 2. Try loading previously saved token
    if (fs.existsSync(TOKEN_PATH)) {
        const tokenJSON = fs.readFileSync(TOKEN_PATH, "utf-8");
        oAuth2Client.setCredentials(JSON.parse(tokenJSON));
    } else {
        // If we don't have a token yet, you'd run the manual flow
        // Or handle it however you prefer.
        throw new Error("No token.json found. Please run an initial auth flow to get your token.");
    }

    // 3. Return the Gmail client
    return google.gmail({ version: "v1", auth: oAuth2Client });
}
