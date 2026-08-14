import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField } from "@/components/ui/FormField";

describe("Milestone 38 — General Form Field UX Audit", () => {
  it("does not flash error message while user is actively typing", () => {
    function Wrapper() {
      const [email, setEmail] = React.useState("");
      return (
        <FormField
          label="Official Email Address"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          validate={(val) =>
            val.includes("@") ? null : "Please enter a valid school email address (e.g. admin@school.edu.ng)"
          }
        />
      );
    }

    const { container } = render(<Wrapper />);
    const input = container.querySelector("input#email") as HTMLInputElement;

    // Type partial input without @
    fireEvent.change(input, { target: { value: "incomplete-email" } });

    // Should NOT show error while typing
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("validates on blur and displays specific actionable error message next to the field", () => {
    function Wrapper() {
      const [admNo, setAdmNo] = React.useState("ADM-104");
      return (
        <FormField
          label="Admission Number"
          name="admissionNumber"
          value={admNo}
          onChange={(e) => setAdmNo(e.target.value)}
          validate={(val) =>
            val === "ADM-104"
              ? "Admission number must be unique — ADM-104 is already in use by another student"
              : null
          }
        />
      );
    }

    const { container } = render(<Wrapper />);
    const input = container.querySelector("input#admissionNumber") as HTMLInputElement;

    // Trigger blur
    fireEvent.blur(input);

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain(
      "Admission number must be unique — ADM-104 is already in use by another student"
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
