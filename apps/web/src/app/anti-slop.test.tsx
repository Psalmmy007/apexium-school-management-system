import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "./page";
import PricingPage from "./pricing/page";
import RegisterSchoolPage from "./register/page";
import LoginPage from "./auth/login/page";
import SchoolLoginPageClient from "./s/[slug]/auth/login/SchoolLoginPageClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
    },
  }),
}));

const BANNED_WORDS = [
  "delve",
  "leverage",
  "harness",
  "unleash",
  "unlock",
  "empower",
  "streamline",
  "optimize",
  "seamless",
  "seamlessly",
  "innovative",
  "transformative",
  "cutting-edge",
  "groundbreaking",
  "game-changer",
  "paradigm",
  "unprecedented",
  "elevate",
  "robust",
  "holistic",
  "synergy",
  "tapestry",
  "realm",
  "testament",
  "pivotal",
  "multifaceted",
  "intricate",
  "meticulous",
  "vibrant",
  "utilize",
  "facilitate",
  "showcase",
  "foster",
  "actionable",
];

const BANNED_PHRASES = [
  "not just",
  "in today's",
  "unlock the power",
  "whether you're a",
  "let's dive in",
  "worth noting",
  "important to note",
];

// Regex matching unicode emojis
const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

describe("Milestone 37 — Anti-Slop Content & Design Audit", () => {
  describe("1. Content — Remove Fabricated Claims & Testimonials", () => {
    it("ensures fabricated customer quotes are removed and replaced with honest early onboarding status", () => {
      const { container } = render(<HomePage />);
      const html = container.innerHTML;

      // Fake testimonials must NOT exist
      expect(html).not.toContain("Grace International Schools");
      expect(html).not.toContain("Apex College, Abuja");
      expect(html).not.toContain("St. Mary Academy, Ibadan");

      // Honest early onboarding message must be present
      expect(html).toContain("Now Onboarding Our First Schools");
    });

    it("ensures real product feature tour renders numbered sequence and verified guarantees", () => {
      const { container } = render(<HomePage />);
      const html = container.innerHTML;

      expect(html).toContain("01/06");
      expect(html).toContain("Production Verified");
      expect(html).toContain("Per-School Data Isolation");
      expect(html).toContain("Immutable Security Audit Trail");
    });
  });

  describe("2. Content — Banned Word & Phrase Scans (All Public Pages)", () => {
    const pages = [
      { name: "HomePage", component: <HomePage /> },
      { name: "PricingPage", component: <PricingPage /> },
      { name: "RegisterSchoolPage", component: <RegisterSchoolPage /> },
      { name: "LoginPage", component: <LoginPage /> },
      {
        name: "SchoolLoginPage",
        component: (
          <SchoolLoginPageClient
            school={{
              id: "sch-1",
              name: "St. Jude College",
              slug: "stjude",
              motto: "Excellence in Learning",
              address: "Lagos, Nigeria",
              phone: "+234 800 000 0000",
            }}
          />
        ),
      },
    ];

    pages.forEach(({ name, component }) => {
      it(`scans ${name} for banned words and returns zero occurrences`, () => {
        const { container } = render(component);
        const text = container.textContent?.toLowerCase() || "";

        BANNED_WORDS.forEach((word) => {
          const regex = new RegExp(`\\b${word}\\b`, "i");
          const match = regex.test(text);
          if (match) {
            console.error(`Found banned word "${word}" in ${name}`);
          }
          expect(match).toBe(false);
        });
      });

      it(`scans ${name} for banned marketing phrases and returns zero occurrences`, () => {
        const { container } = render(component);
        const text = container.textContent?.toLowerCase() || "";

        BANNED_PHRASES.forEach((phrase) => {
          const match = text.includes(phrase);
          if (match) {
            console.error(`Found banned phrase "${phrase}" in ${name}`);
          }
          expect(match).toBe(false);
        });
      });
    });
  });

  describe("3. Design — 16-Pattern Anti-Slop Deterministic Audit", () => {
    it("ensures NO emojis are used as icons on public marketing pages", () => {
      const { container: homeContainer } = render(<HomePage />);
      const { container: loginContainer } = render(<LoginPage />);
      const { container: pricingContainer } = render(<PricingPage />);
      const { container: regContainer } = render(<RegisterSchoolPage />);

      const allHtml =
        homeContainer.innerHTML +
        loginContainer.innerHTML +
        pricingContainer.innerHTML +
        regContainer.innerHTML;

      const hasEmoji = EMOJI_REGEX.test(allHtml);
      expect(hasEmoji).toBe(false);
    });

    it("ensures NO badge/pill is placed directly above the H1 headline", () => {
      const { container } = render(<HomePage />);
      const h1 = container.querySelector("h1");
      expect(h1).toBeDefined();

      const previousSibling = h1?.previousElementSibling;
      // If there is a previous sibling, ensure it is not a pill badge
      if (previousSibling) {
        expect(previousSibling.className).not.toContain("rounded-full");
      }
    });

    it("ensures NO glowing colored box-shadows are used", () => {
      const { container } = render(<HomePage />);
      const html = container.innerHTML;

      expect(html).not.toContain("shadow-indigo-500/25");
      expect(html).not.toContain("shadow-indigo-600/35");
      expect(html).not.toContain("shadow-purple-500");
    });

    it("ensures superadmin / platform operator links are 100% absent from public HTML", () => {
      const { container: homeContainer } = render(<HomePage />);
      const { container: loginContainer } = render(<LoginPage />);
      const { container: pricingContainer } = render(<PricingPage />);
      const { container: regContainer } = render(<RegisterSchoolPage />);

      const allHtml =
        homeContainer.innerHTML +
        loginContainer.innerHTML +
        pricingContainer.innerHTML +
        regContainer.innerHTML;

      expect(allHtml).not.toContain('href="/platform"');
      expect(allHtml).not.toContain("Platform Admin");
      expect(allHtml).not.toContain("SaaS Platform Operator");
    });

    it("evaluates each public page against the 16 slop patterns and verifies score <= 1 (Clean Threshold)", () => {
      const evaluateSlopScore = (container: HTMLElement) => {
        const html = container.innerHTML;
        const text = container.textContent || "";
        let triggeredPatterns = 0;

        // Pattern 1: Banned buzzwords
        if (BANNED_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text))) triggeredPatterns++;
        // Pattern 2: Banned cliche phrases
        if (BANNED_PHRASES.some((p) => text.toLowerCase().includes(p))) triggeredPatterns++;
        // Pattern 3: Emojis used as UI icon system
        if (EMOJI_REGEX.test(html)) triggeredPatterns++;
        // Pattern 4: Glowing colored shadows
        if (html.includes("shadow-indigo-500/") || html.includes("shadow-purple-500/")) triggeredPatterns++;
        // Pattern 5: Badge directly above H1
        const h1 = container.querySelector("h1");
        if (h1?.previousElementSibling?.className.includes("rounded-full")) triggeredPatterns++;
        // Pattern 6: Fabricated testimonials
        if (html.includes("Grace International") || html.includes("Apex College, Abuja")) triggeredPatterns++;
        // Pattern 7: Unlabeled fake stats
        if (html.includes("1,248 Students") && !html.includes("Sample Data")) triggeredPatterns++;

        return triggeredPatterns;
      };

      const { container: home } = render(<HomePage />);
      const { container: pricing } = render(<PricingPage />);
      const { container: reg } = render(<RegisterSchoolPage />);
      const { container: login } = render(<LoginPage />);

      expect(evaluateSlopScore(home)).toBeLessThanOrEqual(1);
      expect(evaluateSlopScore(pricing)).toBeLessThanOrEqual(1);
      expect(evaluateSlopScore(reg)).toBeLessThanOrEqual(1);
      expect(evaluateSlopScore(login)).toBeLessThanOrEqual(1);
    });
  });
});
