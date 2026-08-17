import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlobalButtonFeedback } from "@/components/ui/GlobalButtonFeedback";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Global Button Feedback & Universal Loading States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<GlobalButtonFeedback />);
  });

  it("sets loading attributes and prevents repeat clicks when an action button is clicked", () => {
    render(
      <div>
        <GlobalButtonFeedback />
        <button id="test-action-btn">Perform Action</button>
      </div>
    );

    const button = screen.getByRole("button", { name: /perform action/i });
    expect(button.getAttribute("data-btn-loading")).toBeNull();

    // Click the button
    act(() => {
      fireEvent.click(button);
    });

    // Check that loading state was applied
    expect(button.getAttribute("data-btn-loading")).toBe("true");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.style.pointerEvents).toBe("none");
  });

  it("sets loading state and initiates navigation feedback when an internal navigation link is clicked", () => {
    render(
      <div>
        <GlobalButtonFeedback />
        <a id="test-nav-link" href="/dashboard/students">
          Students Roster
        </a>
      </div>
    );

    const link = screen.getByRole("link", { name: /students roster/i });
    expect(link.getAttribute("data-btn-loading")).toBeNull();

    // Click navigation link
    act(() => {
      fireEvent.click(link);
    });

    expect(link.getAttribute("data-btn-loading")).toBe("true");
    expect(link.getAttribute("aria-busy")).toBe("true");
    expect(link.style.pointerEvents).toBe("none");
  });

  it("ignores external links and anchor jumps", () => {
    render(
      <div>
        <GlobalButtonFeedback />
        <a id="test-anchor-link" href="#features">
          Jump to Features
        </a>
      </div>
    );

    const anchorLink = screen.getByRole("link", { name: /jump to features/i });
    act(() => {
      fireEvent.click(anchorLink);
    });

    expect(anchorLink.getAttribute("data-btn-loading")).toBeNull();
  });
});
