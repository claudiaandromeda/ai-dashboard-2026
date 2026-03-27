"use client";

import MatchesSyncButton from "@/components/admin/MatchesSyncButton";
import PitchCalibrationTool from "@/components/admin/PitchCalibrationTool";
import { useState } from "react";

export default function CalibrationPage() {
  const [hasSynced, setHasSynced] = useState(false);
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-amber-300">
          Content Creation Platform - Choose Your Moment
        </h1>
        <p className="text-white/70">
          Use the Automatic Content Creation Platform or Create Your Own Content
          with full control. From moment data to product, automatically or to your
          own specification.
        </p>
        <MatchesSyncButton
          pulse={!hasSynced}
          onSyncStart={() => setHasSynced(true)}
        />
      </header>

      <section
        className={`space-y-4 ${
          hasSynced ? "" : "pointer-events-none opacity-40"
        }`}
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Live Moment Creation</h2>
          <p className="mt-2 text-sm text-white/60">
            Connect to live sources and choose automatic or manual calibration.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl border border-emerald-400/30 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-400/10">
              Connect to live broadcast stream
            </button>
          </div>
        </div>
      </section>

      <div className={hasSynced ? "" : "pointer-events-none opacity-40"}>
        <PitchCalibrationTool />
      </div>
    </section>
  );
}
