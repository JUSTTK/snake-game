package config

import (
	"log"
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
		GameUpdateInterval: getEnvAsPositiveInt("GAME_UPDATE_INTERVAL", 150),
		MaxPlayersPerRoom:  getEnvAsPositiveInt("MAX_PLAYERS_PER_ROOM", 4),
		MapWidth:           getEnvAsPositiveInt("MAP_WIDTH", 20),
		MapHeight:          getEnvAsPositiveInt("MAP_HEIGHT", 15),
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

// getEnvAsPositiveInt only accepts values greater than zero. Zero and negative
// values reach panics further down (time.NewTicker(0) in the game loop,
// rand.Intn(0) when spawning food), so a misconfigured environment variable
// falls back to the default with a log line instead of crashing the server.
func getEnvAsPositiveInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.Atoi(value)
	if err != nil || intValue <= 0 {
		log.Printf("Invalid %s=%q, using default %d", key, value, defaultValue)
		return defaultValue
	}
	return intValue
}