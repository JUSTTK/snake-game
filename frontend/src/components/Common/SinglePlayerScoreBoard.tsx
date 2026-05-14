import React from 'react';

interface SinglePlayerScoreBoardProps {
  score: number;
  highScore: number;
}

export const SinglePlayerScoreBoard: React.FC<SinglePlayerScoreBoardProps> = ({
  score,
  highScore,
}) => {
  return (
    <div className="rounded-2xl p-4 shadow-lg" style={{ backgroundColor: 'var(--bg-input)' }}>
      <h3 className="mb-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>分数</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md p-2" style={{ backgroundColor: 'var(--bg-card)' }}>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>当前分数</span>
          <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>{score}</span>
        </div>
        <div className="flex items-center justify-between rounded-md p-2" style={{ backgroundColor: 'var(--bg-card)' }}>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>最高分</span>
          <span className="font-bold" style={{ color: 'var(--accent-yellow)' }}>{highScore}</span>
        </div>
      </div>
    </div>
  );
};
