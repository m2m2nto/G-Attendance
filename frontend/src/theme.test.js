import { describe, it, expect } from "vitest";
import theme from "./theme";

describe("smoke", () => {
  it("loads the MUI theme", () => {
    expect(theme.palette.primary.main).toBeTruthy();
  });
});
