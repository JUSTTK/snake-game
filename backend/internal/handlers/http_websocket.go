package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"snake-game/internal/models"
	"snake-game/internal/services"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/websocket"
)

// WebSocketMessage 定义WebSocket消息格式
type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

type HTTPWebSocketHandler struct {
	gameService     *services.GameService
	roomConnections map[string][]*websocket.Conn
	mu              sync.RWMutex
}

func NewHTTPWebSocketHandler(gameService *services.GameService) *HTTPWebSocketHandler {
	return &HTTPWebSocketHandler{
		gameService:     gameService,
		roomConnections: make(map[string][]*websocket.Conn),
	}
}

func (h *HTTPWebSocketHandler) HandleWebSocket(c *gin.Context) {
	roomID := c.Query("room_id")
	playerID := c.Query("player_id")
	playerName := c.Query("player_name")

	if roomID == "" || playerID == "" || playerName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room_id, player_id, and player_name are required"})
		return
	}

	websocket.Handler(func(ws *websocket.Conn) {
		defer ws.Close()
		defer func() {
			h.gameService.RemovePlayerFromRoom(roomID, playerID)
			h.sendGameStateToRoom(roomID)
		}()

		// 注册连接
		h.mu.Lock()
		h.roomConnections[roomID] = append(h.roomConnections[roomID], ws)
		h.mu.Unlock()

		// 添加玩家到房间
		_, success := h.gameService.AddPlayerToRoom(roomID, playerID, playerName)
		if !success {
			// 如果房间不存在，创建新房间
			if _, exists := h.gameService.GetRoom(roomID); !exists {
				h.gameService.CreateRoomWithID(roomID, roomID)
				// 再次尝试加入
				_, success := h.gameService.AddPlayerToRoom(roomID, playerID, playerName)
				if !success {
					sendMessage(ws, WebSocketMessage{
						Type: "ERROR",
						Data: "Failed to join room",
					})
					return
				}
			} else {
				sendMessage(ws, WebSocketMessage{
					Type: "ERROR",
					Data: "Room is full",
				})
				return
			}
		}

		// 发送初始游戏状态
		h.sendGameStateToRoom(roomID)

		// 处理客户端消息
		h.handleMessages(ws, roomID, playerID)

		// 连接断开时清理
		h.mu.Lock()
		for i, conn := range h.roomConnections[roomID] {
			if conn == ws {
				h.roomConnections[roomID] = append(h.roomConnections[roomID][:i], h.roomConnections[roomID][i+1:]...)
				break
			}
		}
		if len(h.roomConnections[roomID]) == 0 {
			delete(h.roomConnections, roomID)
		}
		h.mu.Unlock()
	}).ServeHTTP(c.Writer, c.Request)
}

func (h *HTTPWebSocketHandler) handleMessages(ws *websocket.Conn, roomID, playerID string) {
	for {
		var data []byte
		err := websocket.Message.Receive(ws, &data)
		if err != nil {
			log.Printf("WebSocket receive error: %v", err)
			return
		}

		var msg WebSocketMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("JSON unmarshal error: %v", err)
			continue
		}

		switch msg.Type {
		case "MOVE":
			if direction, ok := msg.Data.(string); ok {
				if h.gameService.MoveSnake(roomID, playerID, models.Direction(direction)) {
					h.sendGameStateToRoom(roomID)
				}
			}
		case "START_GAME":
			if h.gameService.StartGame(roomID) {
				h.sendGameStateToRoom(roomID)
			}
		case "RESTART_GAME":
			if h.gameService.RestartGame(roomID) {
				h.sendGameStateToRoom(roomID)
			}
		case "PAUSE":
			if h.gameService.PauseGame(roomID) {
				h.sendGameStateToRoom(roomID)
			}
		case "RESUME":
			if h.gameService.ResumeGame(roomID) {
				h.sendGameStateToRoom(roomID)
			}
		case "LEAVE":
			h.gameService.RemovePlayerFromRoom(roomID, playerID)
			h.sendGameStateToRoom(roomID)
			return
		}
	}
}

func (h *HTTPWebSocketHandler) sendGameStateToRoom(roomID string) {
	room, exists := h.gameService.GetRoom(roomID)
	if !exists {
		return
	}

	msg := WebSocketMessage{
		Type: "GAME_STATE",
		Data: gin.H{
			"room_id":      room.ID,
			"game_state":   room.GameState,
			"players":      room.Players,
			"foods":        room.Foods,
			"map_size":     room.MapSize,
			"player_count": len(room.Players),
		},
	}

	// 广播给房间内的所有连接
	h.mu.RLock()
	connections := h.roomConnections[roomID]
	h.mu.RUnlock()

	for _, conn := range connections {
		sendMessage(conn, msg)
	}
}

func sendMessage(ws *websocket.Conn, msg WebSocketMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return
	}

	websocket.Message.Send(ws, data)
}
