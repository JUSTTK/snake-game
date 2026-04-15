import React from 'react';
import { Snake } from '../../types/game';

interface ScoreBoardProps {
  players: Snake[];
  mySnakeId: string | null;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ players, mySnakeId }) => {
  return (
    <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
      <h3 className="mb-3 text-lg font-bold text-white">排行榜</h3>
      <div className="space-y-2">
        {players
          .slice()
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .map((player, index) => (
            <div
              key={player.id ?? `${player.player_id}-${index}`}
              className={`flex items-center justify-between rounded-md p-2 ${
                player.id === mySnakeId ? 'bg-snake-green bg-opacity-20' : 'bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium text-white">
                  #{index + 1} {player.name ?? '玩家'}
                </span>
                {player.id === mySnakeId && (
                  <span className="text-sm text-snake-green">(你)</span>
                )}
              </div>
              <span className="font-bold text-white">{player.score ?? 0}</span>
            </div>
          ))}
      </div>
    </div>
  );
};
