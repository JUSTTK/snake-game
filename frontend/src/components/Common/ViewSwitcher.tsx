import React from 'react';
import type { ViewMode } from '../Game/CameraController';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const viewModeLabels: Record<ViewMode, string> = {
  top: '俯视图',
  isometric: '等轴视图',
  perspective: '透视视图',
};

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex gap-2 mb-4">
      {(Object.keys(viewModeLabels) as ViewMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === mode
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {viewModeLabels[mode]}
        </button>
      ))}
    </div>
  );
};
