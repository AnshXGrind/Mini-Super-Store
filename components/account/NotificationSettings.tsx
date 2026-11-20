"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export default function NotificationSettings() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function enableNotifications() {
    setBusy(true);
    setMessage("");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push notifications are not configured yet.");
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        throw new Error("This browser does not support push notifications.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("The browser returned an incomplete push subscription.");
      }

      const supabase = createClient();
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
      const userId = claimsData?.claims?.sub;
      if (claimsError || typeof userId !== "string") throw new Error("Please sign in again before enabling notifications.");
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: "endpoint" });
      if (error) throw error;
      setMessage("This device is subscribed. Actual alert delivery still requires the store notification sender to be configured.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Notifications could not be enabled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notification-settings">
      <div>
        <strong>Store notifications</strong>
        <p>Get order updates and new offer alerts on this device.</p>
      </div>
      <button type="button" onClick={() => void enableNotifications()} disabled={busy}>
        {busy ? "Enabling…" : "Enable notifications"}
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
