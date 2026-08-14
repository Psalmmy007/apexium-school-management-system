import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActionButton } from "@/components/ui/ActionButton";

describe("Milestone 38 — Button Loading States & Interaction Audit", () => {
  it("renders standard label and icon when not loading", () => {
    render(
      <ActionButton variant="primary">
        Save Record
      </ActionButton>
    );

    const button = screen.getByRole("button", { name: /save record/i });
    expect(button).toBeDefined();
    expect(button.getAttribute("disabled")).toBeNull();
    expect(button.getAttribute("aria-busy")).toBe("false");
  });

  it("enters visible loading state: disabled, spinner rendered, label updated to progress text", () => {
    render(
      <ActionButton loading={true} loadingText="Saving Record…">
        Save Record
      </ActionButton>
    );

    const button = screen.getByRole("button");
    expect(button.getAttribute("disabled")).toBe("");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText(/Saving Record…/i)).toBeDefined();
    expect(screen.queryByText(/Save Record/i)).toBeNull();
  });

  it("re-enables and restores normal label on error / when loading ceases", () => {
    const { rerender } = render(
      <ActionButton loading={true} loadingText="Processing…">
        Pay Now
      </ActionButton>
    );

    let button = screen.getByRole("button");
    expect(button.getAttribute("disabled")).toBe("");
    expect(screen.getByText(/Processing…/i)).toBeDefined();

    // After failure / state reset
    rerender(
      <ActionButton loading={false}>
        Pay Now
      </ActionButton>
    );

    button = screen.getByRole("button", { name: /pay now/i });
    expect(button.getAttribute("disabled")).toBeNull();
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(screen.getByText(/Pay Now/i)).toBeDefined();
  });

  it("prevents multiple clicks while in loading state", () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <ActionButton onClick={handleClick} loading={false}>
        Submit Application
      </ActionButton>
    );

    const button = screen.getByRole("button", { name: /submit application/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Now in loading state
    rerender(
      <ActionButton onClick={handleClick} loading={true} loadingText="Submitting…">
        Submit Application
      </ActionButton>
    );

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1); // Not called a second time
  });
});
