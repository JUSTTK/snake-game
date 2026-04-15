package handlers

import (
	"net/http"
	"snake-game/internal/services"

	"github.com/gin-gonic/gin"
)

type RoomHandler struct {
	gameService *services.GameService
}

func NewRoomHandler(gameService *services.GameService) *RoomHandler {
	return &RoomHandler{
		gameService: gameService,
	}
}

// 获取所有房间列表
func (rh *RoomHandler) GetRooms(c *gin.Context) {
	rooms := rh.gameService.GetRooms()
	c.JSON(http.StatusOK, gin.H{
		"rooms": rooms,
	})
}

// 创建新房间
func (rh *RoomHandler) CreateRoom(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room := rh.gameService.CreateRoom(req.Name)
	c.JSON(http.StatusCreated, gin.H{
		"room": room,
	})
}

// 加入房间
func (rh *RoomHandler) JoinRoom(c *gin.Context) {
	roomID := c.Param("id")
	var req struct {
		PlayerID   string `json:"player_id" binding:"required"`
		PlayerName string `json:"player_name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	snake, success := rh.gameService.AddPlayerToRoom(roomID, req.PlayerID, req.PlayerName)
	if !success {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to join room"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully joined room",
		"snake":   snake,
	})
}