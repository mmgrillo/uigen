import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, string>,
  state: "call" | "result" = "call"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "1", toolName, args, state, result: "ok" };
  }
  return { toolCallId: "1", toolName, args, state };
}

test("str_replace_editor create shows filename", () => {
  render(
    <ToolInvocationBadge
      tool={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("str_replace_editor str_replace shows editing label", () => {
  render(
    <ToolInvocationBadge
      tool={makeInvocation("str_replace_editor", { command: "str_replace", path: "/components/Card.tsx" })}
    />
  );
  expect(screen.getByText("Editing Card.tsx")).toBeDefined();
});

test("str_replace_editor insert shows editing label", () => {
  render(
    <ToolInvocationBadge
      tool={makeInvocation("str_replace_editor", { command: "insert", path: "/utils/helpers.ts" })}
    />
  );
  expect(screen.getByText("Editing helpers.ts")).toBeDefined();
});

test("str_replace_editor view shows reading label", () => {
  render(
    <ToolInvocationBadge
      tool={makeInvocation("str_replace_editor", { command: "view", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

test("file_manager rename shows renaming label", () => {
  render(
    <ToolInvocationBadge
      tool={makeInvocation("file_manager", { command: "rename", path: "/Button.tsx" })}
    />
  );
  expect(screen.getByText("Renaming Button.tsx")).toBeDefined();
});

test("file_manager delete shows deleting label", () => {
  render(
    <ToolInvocationBadge
      tool={makeInvocation("file_manager", { command: "delete", path: "/old/File.tsx" })}
    />
  );
  expect(screen.getByText("Deleting File.tsx")).toBeDefined();
});

test("unknown tool falls back to tool name", () => {
  render(
    <ToolInvocationBadge
      tool={makeInvocation("some_other_tool", { command: "run", path: "/foo.ts" })}
    />
  );
  expect(screen.getByText("some_other_tool")).toBeDefined();
});

test("shows spinner while in progress", () => {
  const { container } = render(
    <ToolInvocationBadge
      tool={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("shows green dot when done", () => {
  const { container } = render(
    <ToolInvocationBadge
      tool={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result")}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
