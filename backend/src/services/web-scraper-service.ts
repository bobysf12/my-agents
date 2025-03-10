import { chromium } from "playwright-extra";
import * as cheerio from "cheerio";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import TurndownService from "turndown";
import { createLogger } from "../utils/logger";

chromium.use(StealthPlugin());

const logger = createLogger("scrape-service");

export async function getHTML(urls: string[]) {
    const browser = await chromium.launch({ headless: true });
    const results = [];

    for (const url of urls) {
        const page = await browser.newPage(); // New page for each URL
        await page.setExtraHTTPHeaders({
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        });
        try {
            await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

            // Wait for the main content to load (optional additional wait could be removed)
            await page.waitForSelector("body");

            const html = await page.content();
            results.push({ url, html });
        } catch (error) {
            results.push({ url, error: error.message });
            logger.error("Error getting HTML for %s: %s", url, error);
        } finally {
            await page.close(); // Ensure page is always closed
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
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

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

/**
 * Detects if the given HTML likely uses dynamic JavaScript frameworks.
 * Looks for common markers like Next.js, React, Nuxt, or Vue.
 */
function detectJSFrameworks(html: string): boolean {
    // Next.js often renders a script with id __NEXT_DATA__
    if (html.includes("__NEXT_DATA__") || html.includes("next-route")) return true;
    // React apps sometimes include a marker attribute for the root element.
    if (html.includes("data-reactroot")) return true;
    // Nuxt.js uses a specific container for hydration.
    if (html.includes('id="__nuxt"')) return true;
    if (html.toLowerCase().includes("enable javascript")) return true;
    // Vue apps might load Vue via a script reference
    if (html.includes("vue.runtime.min.js") || html.includes("vue.js")) return true;
    return false;
}

export async function deepScrapeWebsite(
    url: string,
    options: {
        headless?: boolean;
        maxDepth?: number;
        transformToMarkdown?: boolean;
        maxUrls?: number;
        dynamicContentThreshold?: number; // in characters
        priorityKeywords?: string[];
    } = {},
) {
    const {
        headless = true,
        maxDepth = 0,
        transformToMarkdown = false,
        maxUrls = 30,
        dynamicContentThreshold = 500, // threshold for static content length
        priorityKeywords = ["home", "about", "career"],
    } = options;

    const results: any[] = [];
    const visitedUrls = new Set<string>();
    const originalOrigin = new URL(url).origin;
    const turndownService = new TurndownService();

    // Browser instance for dynamic rendering (only if needed)
    let browser: any = null;

    // Lightweight static fetch using an HTTP client.
    async function getStaticHTML(pageUrl: string): Promise<string> {
        const response = await fetch(pageUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });
        return await response.text();
    }

    // Dynamic fetch using Playwright when static content isn’t sufficient.
    async function getDynamicHTML(pageUrl: string): Promise<string> {
        if (!browser) {
            browser = await chromium.launch({ headless });
        }
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        });
        await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30000 });
        // Allow time for dynamic content to load.
        await page.waitForTimeout(2000);
        const content = await page.evaluate(() => {
            const body = document.body.cloneNode(true) as HTMLElement;
            // Remove non-content elements.
            ["script", "iframe"].forEach((selector) => {
                const elements = body.querySelectorAll(selector);
                elements.forEach((el) => el.remove());
            });
            return body.innerHTML;
        });
        await page.close();
        return content;
    }

    // Recursive scraping function.
    async function scrape(currentUrl: string, depth: number = 0) {
        if (depth > maxDepth || visitedUrls.size >= maxUrls) return;
        if (visitedUrls.has(currentUrl)) return;

        visitedUrls.add(currentUrl);
        logger.info("Scraping: " + currentUrl);

        let html: string;
        let usedDynamic = false;

        try {
            // Try a static fetch first.
            html = await getStaticHTML(currentUrl);
            const strippedText = html.replace(/<[^>]*>/g, "").trim();

            // Determine if dynamic fetching is needed either based on content length
            // or by detecting popular JS framework markers.
            if (strippedText.length < dynamicContentThreshold || detectJSFrameworks(html)) {
                logger.info(
                    "Static fetch seems insufficient or a JS framework was detected; switching to dynamic rendering for: " +
                        currentUrl,
                );
                html = await getDynamicHTML(currentUrl);
                usedDynamic = true;
            }
        } catch (error: any) {
            logger.error("Static fetch error for " + currentUrl + ": " + error.message);
            // Fallback to dynamic rendering in case of an error.
            try {
                html = await getDynamicHTML(currentUrl);
                usedDynamic = true;
            } catch (dynError: any) {
                logger.error("Dynamic rendering failed for " + currentUrl + ": " + dynError.message);
                results.push({ url: currentUrl, error: dynError.message });
                return;
            }
        }

        // Clean up HTML using Cheerio.
        const $ = cheerio.load(html);
        $("script, iframe,  style").remove();
        const cleanedHTML = $.html();

        // Extract same-origin links (ignoring hash fragments).
        let links: string[] = [];

        $("a[href]").each((_, elem) => {
            const href = $(elem).attr("href");
            if (!href) return;
            try {
                const resolvedUrl = new URL(href, currentUrl).href;
                if (new URL(resolvedUrl).origin === originalOrigin && !resolvedUrl.includes("#")) {
                    const path = new URL(resolvedUrl).pathname;
                    const extension = path.split(".").pop()?.toLowerCase();
                    const nonWebExtensions = [
                        "jpg",
                        "jpeg",
                        "png",
                        "gif",
                        "bmp",
                        "webp",
                        "mp4",
                        "avi",
                        "mov",
                        "wmv",
                        "flv",
                        "mkv",
                        "pdf",
                        "doc",
                        "docx",
                        "xls",
                        "xlsx",
                        "ppt",
                        "pptx",
                    ];
                    if (!extension || !nonWebExtensions.includes(extension)) {
                        links.push(resolvedUrl);
                    }
                }
            } catch (e) {
                // Skip invalid URLs.
            }
        });

        // Prioritize links based on keywords
        links = links.sort((a, b) => {
            const aPriority = priorityKeywords.some((keyword) => a.includes(keyword)) ? 1 : 0;
            const bPriority = priorityKeywords.some((keyword) => b.includes(keyword)) ? 1 : 0;
            return bPriority - aPriority;
        });

        logger.info(cleanedHTML, "HTML Result");

        const finalContent = transformToMarkdown ? turndownService.turndown(cleanedHTML) : cleanedHTML;

        results.push({
            url: currentUrl,
            result: finalContent,
            links,
            dynamic: usedDynamic,
        });

        // Recursively process the same-origin links.
        for (const link of links) {
            if (visitedUrls.size >= maxUrls) break;
            await scrape(link, depth + 1);
        }
    }

    await scrape(url);

    if (browser) {
        await browser.close();
    }
    return results;
}

export async function createScreenshotForInstagram(
    html: string,
    path: string = `screenshots/${Date.now()}screenshot.png`,
) {
    // Render HTML using Playwright
    const browser = await chromium.launch();

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(html);

    // Take screenshots
    const buffer = await page.screenshot({ path, fullPage: true });
    await browser.close();

    return { path, buffer };
}
