"use client";

import React from "react";

const steps = [
  {
    num: "1",
    title: "Copy a link",
    description: "Find a video or Reel on Instagram. Copy the URL.",
  },
  {
    num: "2",
    title: "Paste it here",
    description:
      "Drop the link into the input above. We detect the content type automatically.",
  },
  {
    num: "3",
    title: "Download",
    description:
      "Choose your quality and save. No account, no tracking, no fuss.",
  },
];

/**
 * "How it works" section with numbered steps.
 * Follows AuraVault design: display font numbers, hand-drawn arrow connections.
 */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="w-full">
      <h2
        id="how-it-works-title"
        className="font-display font-medium italic text-(--color-ink-900) mb-8"
      >
        How it works
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {steps.map((step, i) => (
          <div key={step.num} className="relative">
            <div className="font-display italic font-medium text-[64px] leading-none text-terra-500">
              {step.num}
            </div>
            <h3 className="mt-2 mb-1.5 font-display font-medium text-[26px] text-(--color-ink-900)">
              {step.title}
            </h3>
            <p className="text-[15px] leading-[1.6] text-(--color-ink-500) m-0">
              {step.description}
            </p>

            {/* Hand-drawn arrow between steps (desktop only) */}
            {i < steps.length - 1 && (
              <img
                src="/assets/sketch-arrow.svg"
                alt=""
                aria-hidden="true"
                className="hidden md:block absolute top-[30px] right-[-10px] w-[80px] opacity-85"
                style={{ transform: "rotate(-10deg)" }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
