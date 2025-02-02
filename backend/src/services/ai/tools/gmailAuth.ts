import fs from "fs";
import path from "path";
import { google } from "googleapis";

const SCOPES = ["https://mail.google.com/"];
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
        "https://localhost:3000", // e.g., http://127.0.0.1:3000 or for copy/paste flows
    );

    // 2. Try loading previously saved token
    if (fs.existsSync(TOKEN_PATH)) {
        const tokenJSON = fs.readFileSync(TOKEN_PATH, "utf-8");
        oAuth2Client.setCredentials(JSON.parse(tokenJSON));
    } else {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
        });

        console.log("Open this url:", authUrl);
        console.log("Then paste the code here:");
        const readline = require("readline").createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const code = await new Promise<string>((resolve) => {
            readline.question("Enter the code from that page here: ", (code) => {
                readline.close();
                resolve(code);
            });
        });

        const token = await new Promise((resolve, reject) => {
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    reject("Error retrieving access token: " + err);
                } else {
                    resolve(token);
                }
            });
        });

        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log("Token stored to", TOKEN_PATH);
    }

    // 3. Return the Gmail client
    return google.gmail({ version: "v1", auth: oAuth2Client });
}
