import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { createLogger } from "../utils/logger";

chromium.use(StealthPlugin());

const logger = createLogger("scrape-service");

export async function getHTML(urls: string[]) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const results = [];

    for (const url of urls) {
        try {
            await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

            // Wait for the main content to load
            await page.waitForSelector("body");
            await page.waitForTimeout(2000);

            const html = await page.content();

            results.push({
                url,
                html,
            });
        } catch (error) {
            results.push({
                url,
                error: error?.message,
            });
            logger.error(error, "Error getting html");
        }
    }

    await browser.close();
    return results;
}
// Function to get HTML body content
export async function getHTMLBody(urls: string[], headless: boolean = true) {
    const browser = await chromium.launch({ headless });
    const page = await browser.newPage();
    const results = [];

    await page.setExtraHTTPHeaders({
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });

    for (const url of urls) {
        try {
            await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

            // Wait for the main content to load
            await page.waitForSelector("body");
            await page.waitForTimeout(2000);

            const bodyHTML = await page.evaluate(() => {
                const body = document.body.cloneNode(true);
                // @ts-ignore
                const scripts = body.getElementsByTagName("script");
                // @ts-ignore
                const iframes = body.getElementsByTagName("iframe");

                while (scripts.length > 0) {
                    scripts[0].parentNode.removeChild(scripts[0]);
                }

                while (iframes.length > 0) {
                    iframes[0].parentNode.removeChild(iframes[0]);
                }

                // @ts-ignore
                return body.innerHTML;
            });

            results.push({
                url,
                bodyHTML,
            });
        } catch (error) {
            results.push({
                url,
                error: error?.message,
            });
            logger.error(error, "Error getting body HTML");
        }
    }

    await browser.close();
    return results;
}

// Helper function to scrape content
export async function scrapeContent(urls: string[], maxPages: number = 5) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const results = [];

    let count = 0;
    for (const url of urls) {
        if (count >= maxPages) break;

        try {
            await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

            // Wait for the main content to load
            await page.waitForSelector("body"); // Replace with a more specific selector if needed
            await page.waitForTimeout(2000); // Optional: Adjust for rendering time

            // Extract headings
            const headings = await page.$$eval("h1, h2, h3", (elements) =>
                elements.map((h) => h.textContent?.trim()).filter(Boolean),
            );

            // Extract paragraphs
            const paragraphs = await page.$$eval("p", (elements) =>
                elements.map((p) => p.textContent?.trim()).filter(Boolean),
            );

            // Extract articles
            const articles = await page.$$eval("article", (elements) =>
                elements.map((article) => article.textContent?.trim()).filter(Boolean),
            );

            // Extract lists
            const lists = await page.$$eval("ul, ol", (elements) =>
                elements.map((list) => Array.from(list.querySelectorAll("li")).map((li) => li.textContent?.trim())),
            );

            // Extract tables
            const tables = await page.$$eval("table", (tables) =>
                tables.map((table) => {
                    const rows = Array.from(table.querySelectorAll("tr"));
                    return rows.map((row) =>
                        Array.from(row.querySelectorAll("td, th")).map((cell) => cell.textContent?.trim()),
                    );
                }),
            );

            // Structure content
            results.push({
                url,
                headings,
                paragraphs,
                lists,
                tables,
                articles,
            });

            count++;
        } catch (error) {
            logger.error(error, `Error scraping ${url}:`, error.message);
            results.push({ url, error: error?.message });
        }
    }

    await browser.close();
    return results;
}
