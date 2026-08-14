import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PasswordField } from "@/components/ui/PasswordField";

describe("Milestone 38 — Password Field UX Audit", () => {
  it("renders with type='password' by default and toggles to type='text' on clicking show/hide toggle", () => {
    function Wrapper() {
      const [pwd, setPwd] = React.useState("MySecret123");
      return <PasswordField id="test-pwd" value={pwd} onChange={(e) => setPwd(e.target.value)} />;
    }

    const { container } = render(<Wrapper />);
    const input = container.querySelector("input#test-pwd") as HTMLInputElement;
    expect(input.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /reveal entered characters/i });
    fireEvent.click(toggleBtn);
    expect(input.type).toBe("text");

    const hideBtn = screen.getByRole("button", { name: /mask entered characters/i });
    fireEvent.click(hideBtn);
    expect(input.type).toBe("password");
  });

  it("updates live requirement checklist dynamically as user types", () => {
    function Wrapper() {
      const [pwd, setPwd] = React.useState("abc");
      return (
        <div>
          <PasswordField id="test-pwd" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          <button onClick={() => setPwd("Abcdefgh8!")}>Fill Strong</button>
        </div>
      );
    }

    const { container } = render(<Wrapper />);
    const input = container.querySelector("input#test-pwd") as HTMLInputElement;
    fireEvent.focus(input);

    // Initial state: abc has letter, but not 8+ chars, not number
    expect(screen.getByText(/8\+ characters/i)).toBeDefined();
    expect(screen.getByText(/At least one number/i)).toBeDefined();

    // Fill strong password
    fireEvent.click(screen.getByText("Fill Strong"));
    expect(screen.getByText(/Strength:/i)).toBeDefined();
  });

  it("displays Caps Lock warning when Caps Lock key is pressed", () => {
    const { container } = render(<PasswordField id="test-pwd" value="test" onChange={() => {}} />);
    const input = container.querySelector("input#test-pwd") as HTMLInputElement;

    // Simulate CapsLock key press
    fireEvent.keyDown(input, { key: "CapsLock" });

    expect(screen.getByText(/Caps Lock is ON/i)).toBeDefined();
  });
});
