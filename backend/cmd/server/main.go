package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"snake-game/internal/config"
	"snake-game/internal/handlers"
	"snake-game/internal/services"

	"github.com/gin-gonic/gin"
)

func setupFrontendRoutes(r *gin.Engine) {
	distPath := filepath.Clean("../frontend/dist")
	indexPath := filepath.Join(distPath, "index.html")

	if _, err := os.Stat(indexPath); err != nil {
		log.Printf("Frontend dist not found at %s; running API/WebSocket only", indexPath)
		r.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"service": "snake-game-backend",
				"status":  "ok",
			})
		})
		return
	}

	r.Static("/static", distPath)
	r.StaticFile("/", indexPath)
	r.NoRoute(func(c *gin.Context) {
		c.File(indexPath)
	})
}

func main() {
	// 加载配置
	cfg := config.Load()

	// 创建游戏服务
	gameService := services.NewGameService(cfg)

	// 创建处理器
	roomHandler := handlers.NewRoomHandler(gameService)
	webSocketHandler := handlers.NewHTTPWebSocketHandler(gameService, cfg)

	// 设置Gin路由
	r := gin.Default()

	// 静态文件服务
	setupFrontendRoutes(r)

	// HTTP路由
	rooms := r.Group("/api/rooms")
	{
		rooms.GET("", roomHandler.GetRooms)
		rooms.POST("", roomHandler.CreateRoom)
		rooms.POST("/:id/join", roomHandler.JoinRoom)
	}

	// WebSocket路由
	r.GET("/ws", webSocketHandler.HandleWebSocket)

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 启动服务器
	port := ":" + cfg.ServerPort
	log.Printf("Server starting on port %s", port)
	log.Fatal(r.Run(port))
}
