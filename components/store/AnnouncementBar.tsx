"use client";

import { useState } from "react";
import {
  getStorePhoneDisplay,
  getStoreWhatsAppNumber,
  STORE_MAP_URL,
} from "@/lib/store-contact";

type Language = "en" | "hi";

export default function AnnouncementBar({
  language: controlledLanguage,
  onLanguageChange,
}: {
  language?: Language;
  onLanguageChange?: (language: Language) => void;
}) {
  const [localLanguage, setLocalLanguage] = useState<Language>("en");
  const language = controlledLanguage ?? localLanguage;
  const isHindi = language === "hi";
  const storePhone = getStoreWhatsAppNumber();
  const phoneDisplay = getStorePhoneDisplay();
  const changeLanguage = onLanguageChange ?? setLocalLanguage;

  return (
    <aside className="topline" aria-label={isHindi ? "दुकान की जानकारी" : "Store information"}>
      <div className="topline-inner">
        <ul className="store-announcements">
          <li>
            <a href={STORE_MAP_URL} target="_blank" rel="noopener noreferrer">
              📍 {isHindi ? "रेड रोड, लाडवा (कुरुक्षेत्र)" : "Red Road, Ladwa (Kurukshetra)"}
            </a>
          </li>
          <li>
            {isHindi
              ? "खुलने का समय: सोमवार–शनिवार, सुबह 9:30 – रात 8:00"
              : "Open 9:30 AM – 8:00 PM, Monday–Saturday"}
          </li>
          <li>
            {isHindi
              ? "रविवार, सुबह 10:00 – दोपहर 1:00"
              : "Open 10:00 AM – 1:00 PM, Sunday"}
          </li>
          <li>
            <a
              href={`https://wa.me/${storePhone}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              💬 {isHindi ? "WhatsApp और कॉल" : "WhatsApp & Call"}: {phoneDisplay}
            </a>
          </li>
          <li>{isHindi ? "लाडवा में होम डिलीवरी" : "Home Delivery in Ladwa"}</li>
          <li>{isHindi ? "कर्बसाइड पिकअप उपलब्ध" : "Curbside Pickup Available"}</li>
        </ul>

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
    </aside>
  );
}
