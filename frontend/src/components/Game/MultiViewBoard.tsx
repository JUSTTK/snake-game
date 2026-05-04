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
      <section className="overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/70 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">主视图</p>
            <h2 className="text-lg font-semibold text-white">{VIEW_MODE_LABELS[selectedView]}</h2>
          </div>
          <p className="hidden text-sm text-slate-400 md:block">
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
            className="group overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/60 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-cyan-400/70 hover:shadow-cyan-950/40"
          >
            <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">预览</p>
                <h3 className="text-base font-semibold text-white">{VIEW_MODE_LABELS[mode]}</h3>
              </div>
              <span className="text-xs text-cyan-300 opacity-0 transition group-hover:opacity-100">
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

        <section className="overflow-hidden rounded-3xl border border-amber-500/30 bg-slate-900/60 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">总览</p>
              <h3 className="text-base font-semibold text-white">全地图俯视</h3>
            </div>
            <span className="text-xs text-slate-400">专门找食物</span>
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
