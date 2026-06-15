package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"snake-game/internal/config"
	"snake-game/internal/models"
	"snake-game/internal/services"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

const (
	maxMovesPerSecond  = 10
	stateChangeCooldown = 1 * time.Second
)

type clientConn struct {
	conn            *websocket.Conn
	mu              sync.Mutex
	moveCount       int
	moveWindowStart time.Time
	lastStateChange time.Time
}

func (c *clientConn) checkMoveRate() bool {
	now := time.Now()
	if now.Sub(c.moveWindowStart) >= time.Second {
		c.moveCount = 0
		c.moveWindowStart = now
	}
	if c.moveCount >= maxMovesPerSecond {
		return false
	}
	c.moveCount++
	return true
}

func (c *clientConn) checkStateChangeCooldown() bool {
	now := time.Now()
	if now.Sub(c.lastStateChange) < stateChangeCooldown {
		return false
	}
	c.lastStateChange = now
	return true
}

func isOriginAllowed(r *http.Request, allowedOrigins []string) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}
	return false
}

func (c *clientConn) writeMessage(msgType int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.WriteMessage(msgType, data)
}

type HTTPWebSocketHandler struct {
	gameService     *services.GameService
	roomConnections map[string][]*clientConn
	mu              sync.RWMutex
	upgrader        websocket.Upgrader
}

func NewHTTPWebSocketHandler(gameService *services.GameService, cfg *config.Config) *HTTPWebSocketHandler {
	allowedOrigins := cfg.AllowedOrigins
	handler := &HTTPWebSocketHandler{
		gameService:     gameService,
		roomConnections: make(map[string][]*clientConn),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return isOriginAllowed(r, allowedOrigins)
			},
		},
	}

	gameService.SetStateUpdateCallback(func(roomID string) {
		handler.sendGameStateToRoom(roomID)
	})

	return handler
}

func (h *HTTPWebSocketHandler) HandleWebSocket(c *gin.Context) {
	roomID := c.Query("room_id")
	playerID := c.Query("player_id")
	playerName := c.Query("player_name")

	if roomID == "" || playerID == "" || playerName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room_id, player_id, and player_name are required"})
		return
	}

	ws, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &clientConn{
		conn:            ws,
		moveWindowStart: time.Now(),
	}
	defer ws.Close()

	defer func() {
		h.gameService.RemovePlayerFromRoom(roomID, playerID)
		h.sendGameStateToRoom(roomID)
	}()

	h.mu.Lock()
	h.roomConnections[roomID] = append(h.roomConnections[roomID], client)
	h.mu.Unlock()

	_, success := h.gameService.AddPlayerToRoom(roomID, playerID, playerName)
	if !success {
		if _, exists := h.gameService.GetRoom(roomID); !exists {
			h.gameService.CreateRoomWithID(roomID, roomID)
			_, success := h.gameService.AddPlayerToRoom(roomID, playerID, playerName)
			if !success {
				sendMessage(client, WebSocketMessage{
					Type: "ERROR",
					Data: "Failed to join room",
				})
				return
			}
		} else {
			sendMessage(client, WebSocketMessage{
				Type: "ERROR",
				Data: "Room is full",
			})
			return
		}
	}

	h.sendGameStateToRoom(roomID)

	h.handleMessages(client, roomID, playerID)

	h.mu.Lock()
	for i, cc := range h.roomConnections[roomID] {
		if cc == client {
			h.roomConnections[roomID] = append(h.roomConnections[roomID][:i], h.roomConnections[roomID][i+1:]...)
			break
		}
	}
	if len(h.roomConnections[roomID]) == 0 {
		delete(h.roomConnections, roomID)
	}
	h.mu.Unlock()
}

func (h *HTTPWebSocketHandler) handleMessages(client *clientConn, roomID, playerID string) {
	for {
		_, data, err := client.conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket receive error: %v", err)
			return
		}

		log.Printf("Received message from %s in room %s: %s", playerID, roomID, string(data))

		var msg WebSocketMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("JSON unmarshal error: %v", err)
			continue
		}

		log.Printf("Parsed message: Type=%s, Data=%v", msg.Type, msg.Data)

		switch msg.Type {
		case "PING":
			sendMessage(client, WebSocketMessage{Type: "PONG", Data: "pong"})
		case "MOVE":
			if !client.checkMoveRate() {
				continue
			}
			if direction, ok := msg.Data.(string); ok {
				log.Printf("Processing MOVE: %s", direction)
				if h.gameService.MoveSnake(roomID, playerID, models.Direction(direction)) {
					h.sendGameStateToRoom(roomID)
				}
			}
		case "START_GAME":
			if !client.checkStateChangeCooldown() {
				continue
			}
			log.Printf("Processing START_GAME")
			if h.gameService.StartGame(roomID) {
				log.Printf("Game started successfully, sending game state")
				h.sendGameStateToRoom(roomID)
			} else {
				log.Printf("Failed to start game (not enough players or invalid state)")
			}
		case "RESTART_GAME":
			if !client.checkStateChangeCooldown() {
				continue
			}
			log.Printf("Processing RESTART_GAME for room %s", roomID)
			if h.gameService.RestartGame(roomID) {
				log.Printf("Game restarted successfully, sending game state")
				h.sendGameStateToRoom(roomID)
			} else {
				log.Printf("Failed to restart game")
			}
		case "PAUSE":
			if !client.checkStateChangeCooldown() {
				continue
			}
			if h.gameService.PauseGame(roomID) {
				h.sendGameStateToRoom(roomID)
			}
		case "RESUME":
			if !client.checkStateChangeCooldown() {
				continue
			}
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

	h.mu.RLock()
	connections := make([]*clientConn, len(h.roomConnections[roomID]))
	copy(connections, h.roomConnections[roomID])
	h.mu.RUnlock()

	for _, client := range connections {
		sendMessage(client, msg)
	}
}

func sendMessage(client *clientConn, msg WebSocketMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return
	}

	if err := client.writeMessage(websocket.TextMessage, data); err != nil {
		log.Printf("WebSocket send error: %v", err)
	}
}