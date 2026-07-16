"use client";

import { useEffect, useState } from "react";

interface TourStep {
  id: string;
  icon: string;
  title: string;
  body: string;
}

// First-run only: fetches whether this user has completed the tour, and if
// not, the current admin-authored step list. "Welcome to Konek" is a fixed
// intro screen (not editable content — it's the app's own greeting), then
// each admin-authored step gets its own screen. Skipping or finishing both
// mark the tour complete so it never reappears.
export function OnboardingTour() {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [stage, setStage] = useState<"welcome" | "steps">("welcome");
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding/tour")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.completed) return;
        setSteps(data.steps ?? []);
        setVisible(true);
      })
      .catch(() => {});
  }, []);

  async function finish() {
    setVisible(false);
    await fetch("/api/onboarding/tour", { method: "POST" }).catch(() => {});
  }

  if (!visible || steps === null) return null;

  const totalScreens = steps.length; // steps only; welcome is separate
  const step = steps[index];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo/60 px-5 backdrop-blur-sm">
      <div className="konek-card-shadow flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white">
        {stage === "welcome" ? (
          <div className="konek-hero flex flex-col items-center px-6 py-10 text-center text-white">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">👋</div>
            <h2 className="font-heading text-2xl font-bold">Welcome to Konek</h2>
            <p className="mt-2 text-sm text-white/75">
              A quick look at how everything fits together before you get started.
            </p>
            <div className="mt-7 flex w-full flex-col gap-2">
              {totalScreens > 0 ? (
                <button
                  onClick={() => setStage("steps")}
                  className="konek-tile rounded-full bg-white px-5 py-3 text-sm font-semibold text-indigo"
                >
                  Start tour
                </button>
              ) : null}
              <button onClick={finish} className="konek-tile rounded-full px-5 py-3 text-sm font-semibold text-white/70">
                {totalScreens > 0 ? "Skip for now" : "Get started"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col px-6 py-10 text-center">
            <div className="mb-4 flex justify-center gap-1.5">
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-indigo" : "w-1.5 bg-indigo/20"}`}
                />
              ))}
            </div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-hover-tint text-3xl">
              {step.icon}
            </div>
            <h2 className="font-heading text-xl font-bold text-indigo">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>

            <div className="mt-8 flex items-center gap-2">
              {index > 0 && (
                <button
                  onClick={() => setIndex((i) => i - 1)}
                  className="konek-tile flex-1 rounded-full border border-border-soft px-5 py-3 text-sm font-semibold text-indigo"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => (index < totalScreens - 1 ? setIndex((i) => i + 1) : finish())}
                className="konek-tile flex-1 rounded-full bg-indigo px-5 py-3 text-sm font-semibold text-white"
              >
                {index < totalScreens - 1 ? "Next" : "Get started"}
              </button>
            </div>
            <button onClick={finish} className="mt-4 text-xs font-medium text-text-secondary">
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
