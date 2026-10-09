package config

import "testing"

func TestLoad_Defaults(t *testing.T) {
	// Explicitly empty so the assertions do not depend on the developer's shell.
	t.Setenv("GAME_UPDATE_INTERVAL", "")
	t.Setenv("MAX_PLAYERS_PER_ROOM", "")
	t.Setenv("MAP_WIDTH", "")
	t.Setenv("MAP_HEIGHT", "")

	cfg := Load()
	if cfg.GameUpdateInterval != 150 {
		t.Errorf("expected GameUpdateInterval 150, got %d", cfg.GameUpdateInterval)
	}
	if cfg.MaxPlayersPerRoom != 4 {
		t.Errorf("expected MaxPlayersPerRoom 4, got %d", cfg.MaxPlayersPerRoom)
	}
	if cfg.MapWidth != 20 || cfg.MapHeight != 15 {
		t.Errorf("expected map 20x15, got %dx%d", cfg.MapWidth, cfg.MapHeight)
	}
}

func TestLoad_ReadsValidValues(t *testing.T) {
	t.Setenv("GAME_UPDATE_INTERVAL", "200")
	t.Setenv("MAX_PLAYERS_PER_ROOM", "6")
	t.Setenv("MAP_WIDTH", "30")
	t.Setenv("MAP_HEIGHT", "25")

	cfg := Load()
	if cfg.GameUpdateInterval != 200 {
		t.Errorf("expected GameUpdateInterval 200, got %d", cfg.GameUpdateInterval)
	}
	if cfg.MaxPlayersPerRoom != 6 {
		t.Errorf("expected MaxPlayersPerRoom 6, got %d", cfg.MaxPlayersPerRoom)
	}
	if cfg.MapWidth != 30 || cfg.MapHeight != 25 {
		t.Errorf("expected map 30x25, got %dx%d", cfg.MapWidth, cfg.MapHeight)
	}
}

// Zero, negative and unparsable values would panic downstream
// (time.NewTicker(0) in the game loop, rand.Intn(0) when spawning food), so
// they must fall back to the defaults instead of reaching the game.
func TestLoad_FallsBackOnInvalidValues(t *testing.T) {
	t.Setenv("GAME_UPDATE_INTERVAL", "0")
	t.Setenv("MAX_PLAYERS_PER_ROOM", "-1")
	t.Setenv("MAP_WIDTH", "abc")
	t.Setenv("MAP_HEIGHT", "0")

	cfg := Load()
	if cfg.GameUpdateInterval != 150 {
		t.Errorf("expected GameUpdateInterval fallback 150, got %d", cfg.GameUpdateInterval)
	}
	if cfg.MaxPlayersPerRoom != 4 {
		t.Errorf("expected MaxPlayersPerRoom fallback 4, got %d", cfg.MaxPlayersPerRoom)
	}
	if cfg.MapWidth != 20 || cfg.MapHeight != 15 {
		t.Errorf("expected map fallback 20x15, got %dx%d", cfg.MapWidth, cfg.MapHeight)
	}
}
