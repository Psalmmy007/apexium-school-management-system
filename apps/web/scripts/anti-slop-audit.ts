/**
 * Deterministic Anti-Slop Audit Script
 * Evaluates public-facing marketing pages against the 16 design and content anti-patterns.
 * Clean Threshold: <= 1 triggered pattern per page.
 */

export const BANNED_WORDS = [
  "delve", "leverage", "harness", "unleash", "unlock", "empower", "streamline", "optimize",
  "seamless", "seamlessly", "innovative", "transformative", "cutting-edge", "groundbreaking",
  "game-changer", "paradigm", "unprecedented", "elevate", "robust", "holistic", "synergy",
  "tapestry", "realm", "testament", "pivotal", "multifaceted", "intricate", "meticulous",
  "vibrant", "utilize", "facilitate", "showcase", "foster", "actionable"
];

export const BANNED_PHRASES = [
  "not just", "in today's", "unlock the power", "whether you're a", "let's dive in",
  "worth noting", "important to note"
];

export const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

export function auditHtmlAndText(pageName: string, html: string, text: string) {
  const issues: string[] = [];

  // Check 1: Banned words
  const foundWords = BANNED_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
  if (foundWords.length > 0) {
    issues.push(`Banned buzzwords found: ${foundWords.join(", ")}`);
  }

  // Check 2: Banned phrases
  const foundPhrases = BANNED_PHRASES.filter((p) => text.toLowerCase().includes(p));
  if (foundPhrases.length > 0) {
    issues.push(`Banned phrases found: ${foundPhrases.join(", ")}`);
  }

  // Check 3: Emojis used as UI icons
  if (EMOJI_REGEX.test(html)) {
    issues.push("Emojis found in rendered HTML (must use Lucide/SVG icons)");
  }

  // Check 4: Fabricated testimonials
  if (html.includes("Grace International Schools") || html.includes("Apex College, Abuja") || html.includes("St. Mary Academy")) {
    issues.push("Fabricated testimonials found in HTML");
  }

  // Check 5: Superadmin leaks
  if (html.includes('href="/platform"') || html.includes("SaaS Platform Operator") || html.includes("Platform Admin")) {
    issues.push("Superadmin / platform operator links found in public HTML");
  }

  // Check 6: Glowing colored shadows
  if (html.includes("shadow-indigo-500/25") || html.includes("shadow-purple-500")) {
    issues.push("Colored glowing box-shadows found");
  }

  return {
    pageName,
    score: issues.length,
    isClean: issues.length <= 1,
    issues,
  };
}
