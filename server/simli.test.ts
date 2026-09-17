import { describe, expect, it } from "vitest";
import { listSimliAvatars } from "./simli";

describe("Simli avatar inventory", () => {
  it("does not call the retired public stock-avatar endpoint", async () => {
    await expect(listSimliAvatars()).resolves.toEqual([]);
  });
});
