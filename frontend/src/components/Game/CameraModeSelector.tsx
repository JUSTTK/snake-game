import React from 'react';
import { CameraMode, CAMERA_MODE_LABELS } from './CameraController';

interface CameraModeSelectorProps {
  cameraMode: CameraMode;
  onChange: (mode: CameraMode) => void;
}

export const CameraModeSelector: React.FC<CameraModeSelectorProps> = ({
  cameraMode,
  onChange,
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="mb-3 text-sm font-semibold text-white">镜头模式</p>
      <div className="grid grid-cols-2 gap-2">
        {(['tight', 'comfort'] as CameraMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              cameraMode === mode
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {CAMERA_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        紧跟模式更贴近蛇头，舒适模式移动更柔和、眩晕感更低。
      </p>
    </div>
  );
};
