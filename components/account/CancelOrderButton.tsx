"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const cancelErrors: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in again to cancel this order.",
  ORDER_ID_REQUIRED: "The order could not be identified. Refresh the page and try again.",
  ORDER_NOT_FOUND: "This order could not be found.",
  ORDER_NOT_YOURS: "This order does not belong to your account.",
  ORDER_CANNOT_BE_CANCELLED: "This order can no longer be cancelled. Please contact the store.",
};

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancelOrder() {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("cancel_own_order", { p_order_id: orderId });
      if (rpcError) {
        const code = Object.keys(cancelErrors).find((key) => rpcError.message.includes(key));
        throw new Error(code ? cancelErrors[code] : "The order could not be cancelled. Please try again or contact the store.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The order could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="order-cancel">
      <button type="button" onClick={() => void cancelOrder()} disabled={busy}>
        {busy ? "Cancelling…" : "Cancel order"}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
