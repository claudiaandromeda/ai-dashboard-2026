"use client";

export interface AdjustmentValues {
  glowIntensity: number;
  patternDensity: number;
  lineThickness: number;
  contrast: number;
}

const SLIDERS: {
  key: keyof AdjustmentValues;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "glowIntensity", label: "Glow Intensity", min: 0, max: 100 },
  { key: "patternDensity", label: "Pattern Density", min: 0, max: 100 },
  { key: "lineThickness", label: "Line Thickness", min: 1, max: 5 },
  { key: "contrast", label: "Contrast", min: 0, max: 100 },
];

interface Props {
  values: AdjustmentValues;
  onChange: (values: AdjustmentValues) => void;
  accentColor?: string;
}

export default function AdjustmentSliders({
  values,
  onChange,
  accentColor = "#8AE234",
}: Props) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
        ⚙️ Adjustments
      </h3>
      <div className="space-y-4">
        {SLIDERS.map(({ key, label, min, max }) => (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">{label}</span>
              <span className="text-xs font-medium text-white">
                {values[key]}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={values[key]}
              onChange={(e) =>
                onChange({ ...values, [key]: Number(e.target.value) })
              }
              className="slider w-full"
              style={
                {
                  "--accent": accentColor,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>

      {/* Scoped slider styles */}
      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: #333;
          outline: none;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent, #8AE234);
          cursor: pointer;
          border: 2px solid #fff;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent, #8AE234);
          cursor: pointer;
          border: 2px solid #fff;
        }
      `}</style>
    </div>
  );
}
