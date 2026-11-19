"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

const THUMB_SIZE = 48;
const TRACK_PADDING = 4;
const COMPLETE_AT = 90;

export default function WholesaleWhatsAppSlider() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const phone = (process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ?? "").replace(
    /\D/g,
    "",
  );
  const configured = /^\d{10,15}$/.test(phone);

  function updateProgress(value: number) {
    const safe = Math.max(0, Math.min(100, value));
    progressRef.current = safe;
    setProgress(safe);
  }

  function moveSlider(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;

    const travel = Math.max(
      1,
      rect.width - THUMB_SIZE - TRACK_PADDING * 2,
    );
    const thumbLeft = clientX - rect.left - THUMB_SIZE / 2;
    updateProgress(
      ((thumbLeft - TRACK_PADDING) / travel) * 100,
    );
  }

  function openWhatsApp() {
    if (!configured) return;

    const message =
      "Hello Mini Super Store! I am interested in wholesale purchases. Please share your wholesale product catalogue, available products, bulk pricing and order details. Thank you.";
    window.location.assign(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!configured) return;
    event.preventDefault();
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (dragging) moveSlider(event.clientX);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    moveSlider(event.clientX);
    setDragging(false);

    if (progressRef.current >= COMPLETE_AT) openWhatsApp();
    else updateProgress(0);
  }

  function handlePointerCancel() {
    setDragging(false);
    updateProgress(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openWhatsApp();
      return;
    }

    let next = progressRef.current;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = Math.min(100, next + 10);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = Math.max(0, next - 10);
    } else if (event.key === "End") {
      next = 100;
    } else if (event.key === "Home") {
      next = 0;
    } else {
      return;
    }

    event.preventDefault();
    updateProgress(next);
    if (next >= COMPLETE_AT) openWhatsApp();
  }

  const travel = Math.max(
    0,
    (trackRef.current?.clientWidth ?? 0) -
      THUMB_SIZE -
      TRACK_PADDING * 2,
  );
  const thumbLeft = TRACK_PADDING + (travel * progress) / 100;

  return (
    <div className="wholesale-card">
      <div className="wholesale-copy">
        <p className="eyebrow">Wholesale enquiries</p>
        <h2 id="wholesale-title">Buying in bulk?</h2>
        <p>Get special wholesale prices. Connect with us directly.</p>
      </div>

      <div
        ref={trackRef}
        className="slider-track"
        aria-label="Wholesale WhatsApp enquiry"
      >
        <div
          className="slider-fill"
          style={{ width: `${thumbLeft + THUMB_SIZE}px` }}
        />
        <span className="slider-label">
          {configured
            ? "WHOLESALE — SLIDE TO CONNECT"
            : "WHOLESALE CONTACT UNAVAILABLE"}
        </span>
        <button
          type="button"
          role="slider"
          disabled={!configured}
          aria-label="Slide to WhatsApp for wholesale enquiry"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${Math.round(progress)} percent`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={handleKeyDown}
          className="slider-thumb"
          style={{ left: `${thumbLeft}px` }}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <p className="slider-help">
        {configured
          ? "Slide right to start your wholesale enquiry."
          : "Please configure the wholesale WhatsApp number."}
      </p>
    </div>
  );
}
