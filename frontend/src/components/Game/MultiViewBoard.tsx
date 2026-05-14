import React from 'react';
import { Room } from '../../types/game';
import { CameraMode, VIEW_MODE_LABELS, VIEW_MODES, ViewMode } from './CameraController';
import { ThreeJSGameBoard } from './ThreeJSGameBoard';

interface MultiViewBoardProps {
  room: Room;
  cellSize?: number;
  selectedView: ViewMode;
  cameraMode: CameraMode;
  onSelectView: (viewMode: ViewMode) => void;
  focusSnakeId?: string;
}

export const MultiViewBoard: React.FC<MultiViewBoardProps> = ({
  room,
  cellSize = 1.2,
  selectedView,
  cameraMode,
  onSelectView,
  focusSnakeId,
}) => {
  const secondaryViews = VIEW_MODES.filter((mode) => mode !== selectedView);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section
        className="overflow-hidden rounded-3xl border shadow-2xl"
        style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)', boxShadow: `0 10px 30px var(--shadow-color)` }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <p className="text-sm uppercase tracking-[0.3em]" style={{ color: 'var(--accent-cyan)' }}>主视图</p>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{VIEW_MODE_LABELS[selectedView]}</h2>
          </div>
          <p className="hidden text-sm md:block" style={{ color: 'var(--text-muted)' }}>
            主视图跟随蛇头，右侧预览和全览帮助你快速找食物。
          </p>
        </div>

        <div className="h-[52vh] min-h-[360px] sm:h-[62vh] xl:h-[72vh]">
          <ThreeJSGameBoard
            room={room}
            cellSize={cellSize}
            viewMode={selectedView}
            cameraMode={cameraMode}
            allowOrbitControls
            focusSnakeId={focusSnakeId}
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {secondaryViews.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSelectView(mode)}
            className="group overflow-hidden rounded-3xl border text-left shadow-lg transition hover:-translate-y-0.5"
            style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-primary)' }}>
              <div>
                <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>预览</p>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{VIEW_MODE_LABELS[mode]}</h3>
              </div>
              <span className="text-xs opacity-0 transition group-hover:opacity-100" style={{ color: 'var(--accent-cyan)' }}>
                放大
              </span>
            </div>
            <div className="h-52 sm:h-64 xl:h-[220px]">
              <ThreeJSGameBoard
                room={room}
                cellSize={cellSize}
                viewMode={mode}
                cameraMode={cameraMode}
                allowOrbitControls={false}
                focusSnakeId={focusSnakeId}
              />
            </div>
          </button>
        ))}

        <section
          className="overflow-hidden rounded-3xl border shadow-lg"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent-yellow)', opacity: 0.9 }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-primary)' }}>
            <div>
              <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--accent-yellow)' }}>总览</p>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>全地图俯视</h3>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>专门找食物</span>
          </div>
          <div className="h-52 sm:h-64 xl:h-[220px]">
            <ThreeJSGameBoard
              room={room}
              cellSize={cellSize}
              viewMode="top"
              cameraMode="comfort"
              allowOrbitControls={false}
              cameraTargetMode="overview"
            />
          </div>
        </section>
      </div>
    </div>
  );
};
