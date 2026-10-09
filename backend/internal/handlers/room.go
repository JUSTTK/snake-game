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
	rooms := rh.gameService.GetRoomsSnapshot()
	c.JSON(http.StatusOK, gin.H{
		"rooms": rooms,
	})
}

// 创建新房间
func (rh *RoomHandler) CreateRoom(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required,max=32"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room := rh.gameService.CreateRoom(req.Name)
	snapshot, _ := rh.gameService.GetRoomSnapshot(room.ID)
	c.JSON(http.StatusCreated, gin.H{
		"room": snapshot,
	})
}