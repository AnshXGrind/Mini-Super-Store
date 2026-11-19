import { describe, expect, it } from "vitest";
import { getStaffNextStatuses } from "../lib/order-status";

describe("staff order transitions", () => {
  it("moves confirmed pickup orders to preparing", () => {
    expect(getStaffNextStatuses("confirmed", "pickup")).toEqual(["preparing"]);
  });

  it("moves preparing delivery orders to out for delivery", () => {
    expect(getStaffNextStatuses("preparing", "delivery")).toEqual(["out_for_delivery"]);
  });

  it("moves preparing pickup orders to ready for pickup", () => {
    expect(getStaffNextStatuses("preparing", "pickup")).toEqual(["ready_for_pickup"]);
  });

  it("allows only completed after ready or delivery", () => {
    expect(getStaffNextStatuses("ready_for_pickup", "pickup")).toEqual(["completed"]);
    expect(getStaffNextStatuses("out_for_delivery", "delivery")).toEqual(["completed"]);
  });

  it("does not expose transitions for terminal states", () => {
    expect(getStaffNextStatuses("pending", "pickup")).toEqual([]);
    expect(getStaffNextStatuses("completed", "pickup")).toEqual([]);
    expect(getStaffNextStatuses("cancelled", "delivery")).toEqual([]);
  });
});
