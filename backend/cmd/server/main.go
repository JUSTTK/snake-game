package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"snake-game/internal/config"
	"snake-game/internal/handlers"
	"snake-game/internal/services"
	"syscall"
	"time"

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
	}

	// WebSocket路由
	r.GET("/ws", webSocketHandler.HandleWebSocket)

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	srv := &http.Server{
		Addr:              ":" + cfg.ServerPort,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// 监听中断信号，收到后优雅退出
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("Server starting on port %s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Print("Shutting down")

	// 先关闭 WebSocket 与游戏循环，否则 Shutdown 会一直等长连接
	webSocketHandler.Shutdown()
	gameService.Shutdown()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Graceful shutdown failed: %v", err)
	}
}
