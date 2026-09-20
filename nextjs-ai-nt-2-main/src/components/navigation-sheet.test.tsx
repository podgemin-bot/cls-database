// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement("a", { href, ...props }, children),
}));

import { NavigationSheet } from "./navigation-sheet";

function sheetTrigger(container: HTMLElement): HTMLElement {
  const trigger = container.querySelector('[data-slot="sheet-trigger"]');
  if (!trigger) throw new Error("sheet trigger not found");
  return trigger as HTMLElement;
}

describe("NavigationSheet", () => {
  it("shows the mobile menu trigger button", () => {
    const { container } = render(<NavigationSheet />);
    expect(sheetTrigger(container)).toBeInTheDocument();
  });

  it("opens the sheet and renders base navigation links", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const { container } = render(<NavigationSheet isLoggedIn isAdmin />);

    await user.click(sheetTrigger(container));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("แดชบอร์ด")).toHaveAttribute("href", "/");
    expect(screen.getByText("โปรไฟล์")).toHaveAttribute("href", "/profile");
    expect(screen.getByText("ดูแลระบบ")).toHaveAttribute("href", "/admin");
  });

  it("does not show profile/admin links when not logged in", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const { container } = render(<NavigationSheet />);

    await user.click(sheetTrigger(container));

    expect(screen.getByText("แดชบอร์ด")).toBeInTheDocument();
    expect(screen.queryByText("โปรไฟล์")).not.toBeInTheDocument();
    expect(screen.queryByText("ดูแลระบบ")).not.toBeInTheDocument();
  });
});