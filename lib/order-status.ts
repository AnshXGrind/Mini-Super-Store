export type StoreOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export function getStaffNextStatuses(
  status: StoreOrderStatus,
  fulfilmentType: "pickup" | "delivery",
): StoreOrderStatus[] {
  if (status === "confirmed") return ["preparing"];
  if (status === "preparing") {
    return fulfilmentType === "delivery"
      ? ["out_for_delivery"]
      : ["ready_for_pickup"];
  }
  if (status === "ready_for_pickup" || status === "out_for_delivery") {
    return ["completed"];
  }
  return [];
}
