import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export const AchievementsPanel: React.FC = () => {
  const { achievements, achievementState, achievementsPanelOpen, setAchievementsPanelOpen } = useSettingsStore();

  if (!achievementsPanelOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAchievementsPanelOpen(false)}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
          boxShadow: '0 25px 50px var(--shadow-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>成就</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              已解锁 {unlockedCount}/{totalCount} ({progressPercent}%)
            </p>
          </div>
          <button
            onClick={() => setAchievementsPanelOpen(false)}
            className="rounded-lg px-2 py-1 text-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="mb-4 h-2 rounded-full" style={{ backgroundColor: 'var(--bg-input)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--accent-primary)',
              }}
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 pb-6">
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-4 rounded-xl border px-4 py-3 transition-all"
                style={{
                  borderColor: achievement.unlocked ? 'var(--accent-primary)' : 'var(--border-primary)',
                  backgroundColor: achievement.unlocked ? 'var(--glow-color)' : 'var(--bg-input)',
                  opacity: achievement.unlocked ? 1 : 0.6,
                }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                  style={{
                    backgroundColor: achievement.unlocked ? 'var(--accent-primary)' + '22' : 'var(--bg-card)',
                  }}
                >
                  {achievement.unlocked ? achievement.icon : '🔒'}
                </div>
                <div className="flex-1">
                  <p
                    className="text-sm font-medium"
                    style={{ color: achievement.unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {achievement.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {achievement.description}
                  </p>
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      解锁于 {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>
                {achievement.unlocked && (
                  <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="border-t px-6 py-3"
          style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>累计食物: {achievementState.totalFoodEaten}</span>
            <span>游戏局数: {achievementState.totalGamesPlayed}</span>
            <span>最高分: {achievementState.highScore}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AchievementNotification: React.FC = () => {
  const [notifications, setNotifications] = React.useState<{ id: string; name: string; icon: string; shownAt: number }[]>([]);
  const achievements = useSettingsStore((s) => s.achievements);
  const prevUnlockedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const currentUnlocked = new Set(achievements.filter((a) => a.unlocked).map((a) => a.id));
    const newlyUnlocked = achievements.filter(
      (a) => a.unlocked && !prevUnlockedRef.current.has(a.id)
    );

    if (newlyUnlocked.length > 0 && prevUnlockedRef.current.size > 0) {
      const newNotifs = newlyUnlocked.map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        shownAt: Date.now(),
      }));
      setNotifications((prev) => [...prev, ...newNotifs]);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => Date.now() - n.shownAt < 3000)
        );
      }, 3500);
    }

    prevUnlockedRef.current = currentUnlocked;
  }, [achievements]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-40 space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-slide-in"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--accent-primary)',
            boxShadow: '0 0 15px var(--glow-color)',
          }}
        >
          <span className="text-2xl">{notif.icon}</span>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>成就解锁!</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{notif.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
