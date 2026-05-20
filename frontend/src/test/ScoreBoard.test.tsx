import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBoard } from '../components/Common/ScoreBoard';
import { Snake } from '../types/game';

describe('ScoreBoard', () => {
  const players: Snake[] = [
    {
      id: 's1',
      player_id: 'p1',
      name: 'Alice',
      body: [{ x: 0, y: 0 }],
      direction: 'RIGHT',
      alive: true,
      color: '#4ade80',
      score: 50,
    },
    {
      id: 's2',
      player_id: 'p2',
      name: 'Bob',
      body: [{ x: 5, y: 5 }],
      direction: 'LEFT',
      alive: true,
      color: '#38bdf8',
      score: 30,
    },
    {
      id: 's3',
      player_id: 'p3',
      name: 'Charlie',
      body: [{ x: 10, y: 10 }],
      direction: 'UP',
      alive: false,
      color: '#f472b6',
      score: 10,
    },
  ];

  it('should render all players', () => {
    render(<ScoreBoard players={players} mySnakeId={null} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/Charlie/)).toBeInTheDocument();
  });

  it('should render leaderboard title', () => {
    render(<ScoreBoard players={players} mySnakeId={null} />);
    expect(screen.getByText('排行榜')).toBeInTheDocument();
  });

  it('should sort players by score descending', () => {
    render(<ScoreBoard players={players} mySnakeId={null} />);
    const items = screen.getAllByText(/#\d/);
    expect(items[0]).toHaveTextContent('Alice');
    expect(items[1]).toHaveTextContent('Bob');
    expect(items[2]).toHaveTextContent('Charlie');
  });

  it('should show scores', () => {
    render(<ScoreBoard players={players} mySnakeId={null} />);
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should mark my snake with (你)', () => {
    render(<ScoreBoard players={players} mySnakeId="s1" />);
    expect(screen.getByText('(你)')).toBeInTheDocument();
  });

  it('should not show (你) when mySnakeId is null', () => {
    render(<ScoreBoard players={players} mySnakeId={null} />);
    expect(screen.queryByText('(你)')).not.toBeInTheDocument();
  });

  it('should handle empty players', () => {
    render(<ScoreBoard players={[]} mySnakeId={null} />);
    expect(screen.getByText('排行榜')).toBeInTheDocument();
  });

  it('should handle players without score', () => {
    const noScorePlayers: Snake[] = [
      {
        id: 's1',
        name: 'NoScore',
        body: [{ x: 0, y: 0 }],
        direction: 'RIGHT',
        color: '#4ade80',
      },
    ];
    render(<ScoreBoard players={noScorePlayers} mySnakeId={null} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
