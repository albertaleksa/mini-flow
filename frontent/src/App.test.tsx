import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("./services", async () => {
  const { MockBoardService } = await import("./services/mockBoardService");
  return { boardService: new MockBoardService() };
});
import App from "./App";
import { MockBoardService } from "./services/mockBoardService";

describe("MiniFlow frontend", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    new MockBoardService();
  });

  it("sorts boards by name and moves them with the keyboard", async () => {
    const user = userEvent.setup();
    const service = new MockBoardService();
    await service.createBoard("Zulu", "default");
    await service.createBoard("Alpha", "default");
    render(<App />);
    const aside = await screen.findByRole("complementary");
    const names = () => within(aside).getAllByRole("button")
      .filter((button) => button.classList.contains("board-link"))
      .map((button) => button.textContent?.trim());
    await screen.findByRole("button", { name: /Create your board/i });
    await user.click(within(aside).getByRole("button", { name: "Sort boards A–Z" }));
    expect(names()).toEqual(["AAlpha", "WWebsite redesign", "ZZulu"]);
    await user.click(within(aside).getByRole("button", { name: "Sort boards Z–A" }));
    expect(names()).toEqual(["ZZulu", "WWebsite redesign", "AAlpha"]);
    const zulu = within(aside).getByRole("button", { name: "Z Zulu" });
    zulu.focus();
    await user.keyboard("{ArrowDown}");
    expect(names()).toEqual(["WWebsite redesign", "ZZulu", "AAlpha"]);
    zulu.focus();
    await user.keyboard("{ArrowUp}");
    expect(names()).toEqual(["ZZulu", "WWebsite redesign", "AAlpha"]);
    expect(within(aside).getByRole("button", { name: "Sort boards A–Z" })).toBeInTheDocument();
  });

  it("opens the workspace menu and navigates to a board", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: /Create your board/i });
    await user.click(screen.getByRole("button", { name: /My workspace/i }));
    const menu = screen.getByRole("menu", { name: "Workspace boards" });
    expect(within(menu).getByRole("menuitem", { name: "Website redesign" })).toBeInTheDocument();
    await user.click(within(menu).getByRole("menuitem", { name: "Website redesign" }));
    expect(await screen.findByRole("heading", { name: "Join Website redesign" })).toBeInTheDocument();
  });

  it("keeps Overview visible when its route is selected again", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /Website redesign.*8 tasks/i }));
    expect(await screen.findByRole("heading", { name: "Join Website redesign" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(await screen.findByRole("heading", { name: /Good work starts/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByRole("heading", { name: /Good work starts/i })).toBeInTheDocument();
    expect(screen.queryByText("Loading your workspace…")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /My workspace/i }));
    await user.click(screen.getByRole("menuitem", { name: "All boards" }));
    expect(screen.getByRole("heading", { name: /Good work starts/i })).toBeInTheDocument();
    expect(screen.queryByText("Mock workspace")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Guest")).not.toBeInTheDocument();
  });

  it("changes the current board member display name from the sidebar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /Website redesign.*8 tasks/i }));
    await user.type(screen.getByLabelText("Your display name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Join board" }));
    await user.click(await screen.findByRole("button", { name: /Alex Board member/i }));
    const menu = screen.getByRole("menu", { name: "Board member actions" });
    await user.click(within(menu).getByRole("menuitem", { name: "Change display name" }));
    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Sam");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByRole("button", { name: /Sam Board member/i })).toBeInTheDocument();
  });

  it("reuses a known name on a new board and lists its members", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /Website redesign.*8 tasks/i }));
    await user.type(screen.getByLabelText("Your display name"), "CCC");
    await user.click(screen.getByRole("button", { name: "Join board" }));
    await screen.findByRole("button", { name: /CCC Board member/i });
    await user.click(screen.getByRole("button", { name: "Create a board" }));
    await user.type(screen.getByLabelText("Board name"), "Second board");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create board" }));
    expect(await screen.findByRole("heading", { name: "Second board" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Join Second board" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /1 members/ }));
    expect(within(screen.getByRole("dialog")).getByText("CCC (you)")).toBeInTheDocument();
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
