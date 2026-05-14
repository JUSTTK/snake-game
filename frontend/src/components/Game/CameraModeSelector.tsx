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
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)' }}>
      <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>镜头模式</p>
      <div className="grid grid-cols-2 gap-2">
        {(['tight', 'comfort'] as CameraMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className="rounded-xl px-3 py-2 text-sm font-medium transition-all"
            style={{
              backgroundColor: cameraMode === mode ? 'var(--accent-cyan)' : 'var(--bg-card)',
              color: cameraMode === mode ? 'var(--bg-primary)' : 'var(--text-secondary)',
            }}
          >
            {CAMERA_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        紧跟模式更贴近蛇头，舒适模式移动更柔和、眩晕感更低。
      </p>
    </div>
  );
};
