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
    <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
      <h3 className="mb-3 text-lg font-bold text-white">分数信息</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md bg-gray-700 p-2">
          <span className="font-medium text-white">当前分数</span>
          <span className="font-bold text-white">{score}</span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-gray-700 p-2">
          <span className="font-medium text-white">最高分</span>
          <span className="font-bold text-white">{highScore}</span>
        </div>
      </div>
    </div>
  );
};
