package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerPort string
	GameUpdateInterval int
	MaxPlayersPerRoom int
}

func Load() *Config {
	return &Config{
		ServerPort: getEnv("SERVER_PORT", "8081"),
		GameUpdateInterval: getEnvAsInt("GAME_UPDATE_INTERVAL", 100),
		MaxPlayersPerRoom: getEnvAsInt("MAX_PLAYERS_PER_ROOM", 4),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}