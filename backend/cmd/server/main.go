package main

import (
	"log"
	"snake-game/internal/config"
	"snake-game/internal/handlers"
	"snake-game/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 创建游戏服务
	gameService := services.NewGameService()

	// 创建处理器
	roomHandler := handlers.NewRoomHandler(gameService)
	webSocketHandler := handlers.NewHTTPWebSocketHandler(gameService)

	// 设置Gin路由
	r := gin.Default()

	// 静态文件服务
	r.Static("/static", "../frontend/dist")
	r.LoadHTMLFiles("../frontend/dist/index.html")

	// HTTP路由
	rooms := r.Group("/api/rooms")
	{
		rooms.GET("", roomHandler.GetRooms)
		rooms.POST("", roomHandler.CreateRoom)
		rooms.POST("/:id/join", roomHandler.JoinRoom)
	}

	// WebSocket路由
	r.GET("/ws", webSocketHandler.HandleWebSocket)

	// 前端路由
	r.GET("/", func(c *gin.Context) {
		c.HTML(200, "index.html", nil)
	})

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 启动服务器
	port := ":" + cfg.ServerPort
	log.Printf("Server starting on port %s", port)
	log.Fatal(r.Run(port))
}