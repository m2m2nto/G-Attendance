import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaveDialog from "./LeaveDialog";
import { getLeave, getHolidays } from "../api/client";

vi.mock("../api/client", () => ({
  getLeave: vi.fn(),
  getHolidays: vi.fn(),
}));

const team = [{ name: "Alice" }, { name: "Bob" }];

function renderDialog(props = {}) {
  const onSave = vi.fn();
  render(
    <LeaveDialog
      open
      onClose={() => {}}
      onSave={onSave}
      team={team}
      year={2026}
      leaveType="vacation"
      {...props}
    />,
  );
  return onSave;
}

beforeEach(() => {
  getLeave.mockResolvedValue([]);
  getHolidays.mockResolvedValue([]);
});

describe("LeaveDialog", () => {
  it("renders a new vacation form with the first member preselected", async () => {
    renderDialog();
    expect(screen.getByText("New Vacation")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Alice");
    expect(screen.getByText("No dates selected")).toBeInTheDocument();
    await waitFor(() => expect(getLeave).toHaveBeenCalledWith("vacation", { year: 2026, name: "Alice" }));
  });

  it("keeps Add disabled until a date is selected", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("prefills an edit and saves it grouped by month", async () => {
    const onSave = renderDialog({
      leaveType: "sick_leave",
      entry: { name: "Bob", month: 3, dates_detail: "4, 5(1/2)" },
    });
    expect(screen.getByText("Edit Sick Leave")).toBeInTheDocument();
    expect(screen.getByText("Total: 1.5 days")).toBeInTheDocument();

    const update = screen.getByRole("button", { name: "Update" });
    expect(update).toBeEnabled();
    await userEvent.click(update);
    expect(onSave).toHaveBeenCalledWith([
      { name: "Bob", year: 2026, month: 3, days_count: 1.5, dates_detail: "4, 5(1/2)" },
    ]);
  });

  it("disables Update again when every date chip is removed", async () => {
    renderDialog({ entry: { name: "Bob", month: 3, dates_detail: "4" } });
    const chip = screen.getByText("4 Mar").closest(".MuiChip-root");
    await userEvent.click(chip.querySelector(".MuiChip-deleteIcon"));
    expect(screen.getByText("No dates selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();
  });
});
