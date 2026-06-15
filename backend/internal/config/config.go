package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	ServerPort         string
	GameUpdateInterval int
	MaxPlayersPerRoom  int
	MapWidth           int
	MapHeight          int
	AllowedOrigins     []string
}

func Load() *Config {
	return &Config{
		ServerPort:         getEnv("SERVER_PORT", "8081"),
		GameUpdateInterval: getEnvAsInt("GAME_UPDATE_INTERVAL", 150),
		MaxPlayersPerRoom:  getEnvAsInt("MAX_PLAYERS_PER_ROOM", 4),
		MapWidth:           getEnvAsInt("MAP_WIDTH", 20),
		MapHeight:          getEnvAsInt("MAP_HEIGHT", 15),
		AllowedOrigins:     getEnvAsSlice("ALLOWED_ORIGINS", []string{
			"http://localhost:5173",
			"http://localhost:8081",
			"http://localhost:80",
		}),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		parts := strings.Split(value, ",")
		result := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
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