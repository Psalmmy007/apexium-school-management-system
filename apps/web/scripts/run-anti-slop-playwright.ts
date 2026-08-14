import { chromium } from "@playwright/test";

const BANNED_WORDS = [
  "delve", "leverage", "harness", "unleash", "unlock", "empower", "streamline", "optimize",
  "seamless", "seamlessly", "innovative", "transformative", "cutting-edge", "groundbreaking",
  "game-changer", "paradigm", "unprecedented", "elevate", "robust", "holistic", "synergy",
  "tapestry", "realm", "testament", "pivotal", "multifaceted", "intricate", "meticulous",
  "vibrant", "utilize", "facilitate", "showcase", "foster", "actionable"
];

const BANNED_PHRASES = [
  "not just", "in today's", "unlock the power", "whether you're a", "let's dive in",
  "worth noting", "important to note"
];

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

async function runAudit() {
  console.log("\n=======================================================");
  console.log("🔍 PLAYWRIGHT DETERMINISTIC ANTI-SLOP AUDIT");
  console.log("=======================================================\n");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const pagesToAudit = [
    { name: "Marketing Landing Page", url: "http://localhost:3000/" },
    { name: "Login Portal", url: "http://localhost:3000/auth/login" },
    { name: "Pricing Page", url: "http://localhost:3000/pricing" },
    { name: "Registration Page", url: "http://localhost:3000/register" },
  ];

  let overallClean = true;

  for (const item of pagesToAudit) {
    console.log(`\n--- Auditing ${item.name} (${item.url}) ---`);
    await page.goto(item.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const html = await page.content();
    const text = await page.innerText("body");

    const triggeredPatterns: string[] = [];

    // 1. Check Banned Words
    const foundWords = BANNED_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
    if (foundWords.length > 0) {
      triggeredPatterns.push(`P1 (Banned Buzzwords): Found "${foundWords.join(", ")}"`);
    }

    // 2. Check Banned Phrases
    const foundPhrases = BANNED_PHRASES.filter((p) => text.toLowerCase().includes(p));
    if (foundPhrases.length > 0) {
      triggeredPatterns.push(`P2 (Banned Cliches): Found "${foundPhrases.join(", ")}"`);
    }

    // 3. Check Emojis
    if (EMOJI_REGEX.test(html)) {
      triggeredPatterns.push("P3 (Emoji Icon System): Found emojis used in DOM");
    }

    // 3b. Check Em Dashes & En Dashes (Anti-Slop typography check)
    if (text.includes("—") || text.includes("–")) {
      triggeredPatterns.push("P3b (Em Dash AI Artifact): Found em dash (—) or en dash (–) in rendered copy");
    }

    // 4. Check Purple Gradient VibeCode Background
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    if (html.includes("from-purple-900") || html.includes("from-violet-900") || html.includes("bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400")) {
      triggeredPatterns.push("P4 (VibeCode Purple/Gradient): Found artificial purple/violet gradient washes");
    }

    // 5. Check Colored Glow Shadows
    if (html.includes("shadow-indigo-500/25") || html.includes("shadow-purple-500") || html.includes("shadow-indigo-600/35")) {
      triggeredPatterns.push("P5 (Glowing Shadows): Found colored glow box-shadows");
    }

    // 6. Check Pill/Badge directly above H1
    const badgeAboveH1 = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      if (!h1) return false;
      const prev = h1.previousElementSibling;
      return prev && prev.className.includes("rounded-full");
    });
    if (badgeAboveH1) {
      triggeredPatterns.push("P6 (Badge above H1): Found biscuit pill badge positioned above H1");
    }

    // 7. Check Colored Left/Top Card Borders
    if (html.includes("border-l-4 border-indigo-500") || html.includes("border-t-4 border-indigo-500")) {
      triggeredPatterns.push("P7 (Colored Left/Top Accent Borders): Found AI-style colored card borders");
    }

    // 8. Check Fabricated Testimonials
    if (html.includes("Grace International Schools") || html.includes("Apex College, Abuja") || html.includes("St. Mary Academy")) {
      triggeredPatterns.push("P8 (Fabricated Claims): Found unverified fake testimonials");
    }

    // 9. Check Unlabeled Demo Stats
    if (html.includes("1,248 Students") && !html.includes("Sample")) {
      triggeredPatterns.push("P9 (Unlabeled Stats): Found demonstration statistics without explicit sample label");
    }

    // 10. Check Superadmin / Platform Admin links in public HTML
    if (html.includes('href="/platform"') || html.includes("Platform Admin") || html.includes("SaaS Platform Operator")) {
      triggeredPatterns.push("P10 (Superadmin Route Leak): Found platform admin links in public HTML");
    }

    const score = triggeredPatterns.length;
    const isClean = score <= 1;

    console.log(`Score: ${score} / 16 triggered patterns`);
    if (triggeredPatterns.length > 0) {
      console.log("Triggered patterns:");
      triggeredPatterns.forEach((p) => console.log(`  ❌ ${p}`));
    } else {
      console.log("  ✅ Clean! 0 patterns triggered.");
    }
    console.log(`Status: ${isClean ? "PASSED (Clean Threshold <= 1)" : "FAILED (Heavy Slop >= 4)"}`);

    if (!isClean) overallClean = false;
  }

  await browser.close();

  console.log("\n=======================================================");
  console.log(`AUDIT RESULT: ${overallClean ? "ALL PAGES PASSED (CLEAN)" : "AUDIT FAILED"}`);
  console.log("=======================================================\n");

  if (!overallClean) process.exit(1);
}

runAudit().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
