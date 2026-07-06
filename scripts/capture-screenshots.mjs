import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const outDir = "/Users/myrice/Desktop/github-code/ai-companion/docs/screenshots";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// API 配置弹窗（首次进入）
await page.screenshot({ path: path.join(outDir, "api-config.png") });

// 关闭弹窗，展示主界面
const closeBtn = page.locator("button", { hasText: "稍后再说" });
if (await closeBtn.count()) {
  await closeBtn.click();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: path.join(outDir, "chat-main.png"), fullPage: false });

// 切换到人设设置 Tab
const personaTab = page.locator("button", { hasText: "人设" });
if (await personaTab.count()) {
  await personaTab.click();
  await page.waitForTimeout(400);
}
await page.screenshot({ path: path.join(outDir, "persona-settings.png") });

await browser.close();
console.log("Screenshots saved to", outDir);
