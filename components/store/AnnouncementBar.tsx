"use client";

import { useEffect, useState, type FocusEvent } from "react";
import {
  getStorePhoneInternationalDisplay,
  getStoreWhatsAppNumber,
  STORE_ADDRESS,
  STORE_CURBSIDE_PICKUP_AVAILABLE,
  STORE_HOME_DELIVERY_AREA,
  STORE_MAP_URL,
  STORE_OPENING_HOURS,
} from "@/lib/store-contact";

type Language = "en" | "hi";
type MessageKey = "location" | "weekday" | "sunday" | "contact" | "delivery" | "pickup";

const announcementKeys: MessageKey[] = [
  "location",
  "weekday",
  "sunday",
  "contact",
  "delivery",
  "pickup",
];

const hindiAnnouncementCopy: Record<MessageKey, string> = {
  location: "रेड रोड, लाडवा (कुरुक्षेत्र)",
  weekday: "सोमवार–शनिवार, सुबह 9:30 – रात 8:00",
  sunday: "रविवार, सुबह 10:00 – दोपहर 1:00",
  contact: "",
  delivery: "लाडवा में होम डिलीवरी उपलब्ध",
  pickup: "कर्बसाइड पिकअप उपलब्ध",
};

function getEnglishAnnouncement(key: MessageKey) {
  switch (key) {
    case "location":
      return STORE_ADDRESS;
    case "weekday":
      return `Store Hours: ${STORE_OPENING_HOURS.weekdays}, ${STORE_OPENING_HOURS.weekdayOpen}–${STORE_OPENING_HOURS.weekdayClose}`;
    case "sunday":
      return `${STORE_OPENING_HOURS.sunday}: ${STORE_OPENING_HOURS.sundayOpen}–${STORE_OPENING_HOURS.sundayClose}`;
    case "contact":
      return `WhatsApp & Call: ${getStorePhoneInternationalDisplay()}`;
    case "delivery":
      return `Home Delivery Available in ${STORE_HOME_DELIVERY_AREA}`;
    case "pickup":
      return STORE_CURBSIDE_PICKUP_AVAILABLE ? "Curbside Pickup Available" : "";
  }
}

export default function AnnouncementBar({
  language: controlledLanguage,
  onLanguageChange,
}: {
  language?: Language;
  onLanguageChange?: (language: Language) => void;
}) {
  const [localLanguage, setLocalLanguage] = useState<Language>("en");
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const language = controlledLanguage ?? localLanguage;
  const isHindi = language === "hi";
  const currentKey = announcementKeys[announcementIndex];
  const isPaused = hovered || focused || userPaused || prefersReducedMotion;
  const changeLanguage = onLanguageChange ?? setLocalLanguage;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    let transitionTimer: number | undefined;
    const interval = window.setInterval(() => {
      setPhase("exit");
      transitionTimer = window.setTimeout(() => {
        setAnnouncementIndex((current) => (current + 1) % announcementKeys.length);
        setPhase("enter");
      }, 150);
    }, 3500);

    return () => {
      window.clearInterval(interval);
      if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    };
  }, [isPaused]);

  function pauseForInteraction() {
    setPhase("enter");
    setHovered(true);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    setFocused(false);
    setPhase("enter");
  }

  function renderMessage() {
    const message =
      isHindi && currentKey === "contact"
        ? `WhatsApp और कॉल: ${getStorePhoneInternationalDisplay()}`
        : isHindi
          ? hindiAnnouncementCopy[currentKey]
          : getEnglishAnnouncement(currentKey);
    if (currentKey === "location") {
      return (
        <a href={STORE_MAP_URL} target="_blank" rel="noopener noreferrer">
          📍 {message}
        </a>
      );
    }

    if (currentKey === "contact") {
      return (
        <a
          href={`https://wa.me/${getStoreWhatsAppNumber()}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${message}, open WhatsApp`}
        >
          💬 {message}
        </a>
      );
    }

    return message;
  }

  return (
    <aside
      className="topline"
      aria-label={isHindi ? "दुकान की जानकारी" : "Store information"}
      onMouseEnter={pauseForInteraction}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => {
        setPhase("enter");
        setFocused(true);
      }}
      onBlurCapture={handleBlur}
    >
      <div className="topline-inner">
        <div className="announcement-content">
          <span className="announcement-position" aria-hidden="true">
            {String(announcementIndex + 1).padStart(2, "0")} / 06
          </span>
          <p
            key={currentKey}
            className={`announcement-message ${phase === "exit" ? "is-exiting" : "is-entering"}`}
            aria-live="off"
          >
            {renderMessage()}
          </p>
        </div>

        <div className="announcement-controls">
          <button
            type="button"
            className="announcement-toggle"
            onClick={() => setUserPaused((paused) => !paused)}
            disabled={prefersReducedMotion}
            aria-label={
              prefersReducedMotion
                ? isHindi
                  ? "एनिमेशन कम करने की सेटिंग के कारण घोषणाएँ रुकी हुई हैं"
                  : "Announcements are paused by your reduced motion setting"
                : userPaused
                  ? isHindi
                    ? "घोषणाएँ फिर शुरू करें"
                    : "Resume announcements"
                  : isHindi
                    ? "घोषणाएँ रोकें"
                    : "Pause announcements"
            }
            aria-pressed={userPaused}
            title={
              userPaused
                ? isHindi
                  ? "फिर शुरू करें"
                  : "Resume"
                : isHindi
                  ? "रोकें"
                  : "Pause"
            }
          >
            <span aria-hidden="true">{userPaused || prefersReducedMotion ? "▶" : "Ⅱ"}</span>
          </button>

          <div className="language-switch" role="group" aria-label="Choose language">
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              aria-pressed={!isHindi}
            >
              EN
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => changeLanguage("hi")}
              aria-pressed={isHindi}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
