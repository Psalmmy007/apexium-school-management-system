"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function GlobalButtonFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset loading states when route change completes
  useEffect(() => {
    setIsNavigating(false);
    setProgress(100);

    const timer = setTimeout(() => {
      setProgress(0);
      // Remove loading attributes from all buttons after page load
      document.querySelectorAll("[data-btn-loading='true']").forEach((el) => {
        el.removeAttribute("data-btn-loading");
        el.removeAttribute("aria-busy");
        (el as HTMLElement).style.pointerEvents = "";
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Animate top progress bar when navigating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNavigating) {
      setProgress(15);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 80) return prev + Math.random() * 15;
          if (prev < 92) return prev + 2;
          return prev;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isNavigating]);

  // Global document click interceptor
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Find the closest button or link
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest<HTMLElement>(
        "button, a, [role='button'], input[type='submit']"
      );

      if (!interactive) return;

      // Ignore if already disabled or already loading
      if (
        interactive.hasAttribute("disabled") ||
        interactive.getAttribute("aria-disabled") === "true" ||
        interactive.getAttribute("data-btn-loading") === "true"
      ) {
        return;
      }

      const tagName = interactive.tagName.toLowerCase();

      // Check if it's a link
      if (tagName === "a") {
        const href = interactive.getAttribute("href");
        if (!href) return;

        // Skip anchor-only, mailto, tel, javascript, or external blank target
        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:") ||
          interactive.getAttribute("target") === "_blank"
        ) {
          return;
        }

        // Check if internal navigation
        if (href.startsWith("/") || href.includes(window.location.host)) {
          // Set loading state on button/link
          setButtonLoading(interactive);
          setIsNavigating(true);
        }
        return;
      }

      // Check if it's a button or input[type="submit"]
      if (tagName === "button" || (tagName === "input" && interactive.getAttribute("type") === "submit")) {
        // Form submission or interactive action button
        const form = interactive.closest("form");
        const isSubmit = interactive.getAttribute("type") === "submit" || (form && !interactive.getAttribute("type"));

        // If it's a submit button in a form, check validity first
        if (isSubmit && form && !form.checkValidity()) {
          return; // Browser will show validation tooltip
        }

        setButtonLoading(interactive);

        if (isSubmit) {
          setIsNavigating(true);
        }

        // Safety timeout to reset if no navigation happens (e.g. async fetch inside same page)
        setTimeout(() => {
          resetButtonLoading(interactive);
        }, 8000);
      }
    }

    function setButtonLoading(element: HTMLElement) {
      element.setAttribute("data-btn-loading", "true");
      element.setAttribute("aria-busy", "true");
      element.classList.add("btn-loading-state");

      // Prevent immediate double-clicks
      element.style.pointerEvents = "none";
    }

    function resetButtonLoading(element: HTMLElement) {
      if (element.isConnected) {
        element.removeAttribute("data-btn-loading");
        element.removeAttribute("aria-busy");
        element.classList.remove("btn-loading-state");
        element.style.pointerEvents = "";
      }
    }

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return (
    <>
      {/* Top Viewport Glowing Loading Progress Bar */}
      {progress > 0 && (
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none"
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-sky-400 shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              opacity: progress === 100 ? 0 : 1,
              transition: progress === 100 ? "opacity 300ms ease-out, width 100ms ease-out" : "width 200ms ease-out",
            }}
          />
        </div>
      )}
    </>
  );
}
