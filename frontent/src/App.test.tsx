import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { MockBoardService } from "./services/mockBoardService";

describe("MiniFlow frontend", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    new MockBoardService();
  });

  it("creates a board from a template and joins with a display name", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: /Create your board/i }),
    );
    await user.type(screen.getByLabelText("Board name"), "Weekly launch");
    await user.click(screen.getByRole("button", { name: /Weekly planning/i }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Create board",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Join Weekly launch" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your display name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Join board" }));
    expect(
      await screen.findByRole("heading", { name: "Weekly launch" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "This Week column" }),
    ).toBeInTheDocument();
  });

  it("creates a task and finds it with search", async () => {
    const user = userEvent.setup();
    render(<App />);
    const main = await screen.findByRole("main");
    await user.click(
      within(main).getByRole("button", { name: /Website redesign.*8 tasks/i }),
    );
    await user.type(screen.getByLabelText("Your display name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Join board" }));
    await user.click(await screen.findByRole("button", { name: "New task" }));
    await user.type(
      screen.getByLabelText(/Task title/),
      "Prepare release notes",
    );
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(
      await screen.findByRole("button", { name: "Prepare release notes" }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Search tasks" }),
      "release notes",
    );
    expect(screen.getByText(/Showing 1 of 9 tasks/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Prepare release notes" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Build landing page" }),
    ).not.toBeInTheDocument();
  });

  it("edits and permanently deletes a task after confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    const main = await screen.findByRole("main");
    await user.click(
      within(main).getByRole("button", { name: /Website redesign.*8 tasks/i }),
    );
    await user.type(screen.getByLabelText("Your display name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Join board" }));

    await user.click(
      await screen.findByRole("button", { name: "Build landing page" }),
    );
    const title = screen.getByLabelText(/Task title/);
    await user.clear(title);
    await user.type(title, "Build polished landing page");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Build polished landing page",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Delete task" }));
    expect(
      screen.getByRole("heading", { name: "Delete this task?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete task" }));
    expect(
      screen.queryByRole("button", { name: "Build polished landing page" }),
    ).not.toBeInTheDocument();
  });

  it("adds and renames a column", async () => {
    const user = userEvent.setup();
    render(<App />);
    const main = await screen.findByRole("main");
    await user.click(
      within(main).getByRole("button", { name: /Website redesign.*8 tasks/i }),
    );
    await user.type(screen.getByLabelText("Your display name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Join board" }));

    await user.click(
      await screen.findByRole("button", { name: "Add a column" }),
    );
    await user.type(screen.getByLabelText("New column name"), "Ready to ship");
    await user.click(screen.getByRole("button", { name: "Add column" }));
    expect(
      await screen.findByRole("region", { name: "Ready to ship column" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ready to ship options" }),
    );
    await user.click(screen.getByRole("button", { name: "Rename column" }));
    const name = screen.getByLabelText("Column name");
    await user.clear(name);
    await user.type(name, "Shipped");
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("region", { name: "Shipped column" }),
    ).toBeInTheDocument();
  });
});
