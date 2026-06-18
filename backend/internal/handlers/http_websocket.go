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
	maxMovesPerSecond   = 10
	stateChangeCooldown = 1 * time.Second
	sendBufferSize      = 32
	writeWait           = 10 * time.Second
	pongWait            = 60 * time.Second
	pingPeriod          = 30 * time.Second
)

type clientConn struct {
	conn            *websocket.Conn
	moveCount       int
	moveWindowStart time.Time
	lastStateChange time.Time

	// send is a buffered channel consumed by a single writePump goroutine, so
	// writes to the underlying connection are serialized. A full buffer causes
	// a frame to be dropped rather than blocking the broadcast loop (T0-C).
	send      chan []byte
	done      chan struct{}
	closeOnce sync.Once
	roomID    string
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

// enqueue hands a pre-marshaled message to the writePump. It is non-blocking: a
// full buffer (slow/stuck client) drops the frame instead of stalling the
// broadcast loop. The send channel is never closed, so enqueue is safe to call
// concurrently with closeClient.
func (c *clientConn) enqueue(data []byte) {
	select {
	case c.send <- data:
	default:
		log.Printf("client send buffer full, dropping message in room %s", c.roomID)
	}
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

	// Join the room BEFORE registering the connection so that a failed join
	// (full room / recreate failure) never leaves a stale entry in
	// roomConnections (T0-A).
	_, success := h.gameService.AddPlayerToRoom(roomID, playerID, playerName)
	if !success {
		if _, exists := h.gameService.GetRoom(roomID); !exists {
			h.gameService.CreateRoomWithID(roomID, roomID)
			_, success = h.gameService.AddPlayerToRoom(roomID, playerID, playerName)
		}
		if !success {
			writeDirect(ws, WebSocketMessage{Type: "ERROR", Data: "Failed to join room"})
			ws.Close()
			return
		}
	}

	client := &clientConn{
		conn:            ws,
		send:            make(chan []byte, sendBufferSize),
		done:            make(chan struct{}),
		roomID:          roomID,
		moveWindowStart: time.Now(),
	}
	h.addClient(roomID, client)
	// closeClient is deferred so EVERY return path (LEAVE, read error, panic)
	// unregisters the connection — no leak (T0-A).
	defer h.closeClient(roomID, client)
	defer func() {
		h.gameService.RemovePlayerFromRoom(roomID, playerID)
		h.sendGameStateToRoom(roomID)
	}()

	go h.writePump(client)
	h.sendGameStateToRoom(roomID)
	h.readPump(client, roomID, playerID)
}

// writePump is the single writer for a client connection. It drains the send
// channel, emits periodic pings, and applies a write deadline so a stuck peer
// cannot block it forever (T0-C). Exits when done is closed, the send channel
// is drained after close, or a write fails.
func (h *HTTPWebSocketHandler) writePump(client *clientConn) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()
	for {
		select {
		case <-client.done:
			return
		case message, ok := <-client.send:
			client.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			client.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump reads inbound messages and applies a read deadline refreshed by
// pong frames, so a silently-disconnected client is detected within pongWait
// instead of blocking forever (T0-C). Rate limiting (T0-A's sibling fix) is
// applied here.
func (h *HTTPWebSocketHandler) readPump(client *clientConn, roomID, playerID string) {
	client.conn.SetReadDeadline(time.Now().Add(pongWait))
	client.conn.SetPongHandler(func(string) error {
		client.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, data, err := client.conn.ReadMessage()
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
		case "PING":
			sendMessage(client, WebSocketMessage{Type: "PONG", Data: "pong"})
		case "MOVE":
			if !client.checkMoveRate() {
				continue
			}
			if direction, ok := msg.Data.(string); ok {
				if h.gameService.MoveSnake(roomID, playerID, models.Direction(direction)) {
					h.sendGameStateToRoom(roomID)
				}
			}
		case "START_GAME":
			if !client.checkStateChangeCooldown() {
				continue
			}
			if h.gameService.StartGame(roomID) {
				h.sendGameStateToRoom(roomID)
			}
		case "RESTART_GAME":
			if !client.checkStateChangeCooldown() {
				continue
			}
			if h.gameService.RestartGame(roomID) {
				h.sendGameStateToRoom(roomID)
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
			// defer handles RemovePlayerFromRoom + state broadcast.
			return
		}
	}
}

func (h *HTTPWebSocketHandler) addClient(roomID string, client *clientConn) {
	h.mu.Lock()
	h.roomConnections[roomID] = append(h.roomConnections[roomID], client)
	h.mu.Unlock()
}

func (h *HTTPWebSocketHandler) removeClient(roomID string, client *clientConn) {
	h.mu.Lock()
	conns := h.roomConnections[roomID]
	for i, cc := range conns {
		if cc == client {
			h.roomConnections[roomID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
	if len(h.roomConnections[roomID]) == 0 {
		delete(h.roomConnections, roomID)
	}
	h.mu.Unlock()
}

// closeClient is idempotent (sync.Once) and unregisters+closes the connection.
func (h *HTTPWebSocketHandler) closeClient(roomID string, client *clientConn) {
	client.closeOnce.Do(func() {
		close(client.done)
		h.removeClient(roomID, client)
		client.conn.Close()
	})
}

func (h *HTTPWebSocketHandler) sendGameStateToRoom(roomID string) {
	// Use a lock-held deep snapshot so JSON serialization does not race with
	// the game loop mutating room.Players/Foods (T0-B).
	room, exists := h.gameService.GetRoomSnapshot(roomID)
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

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return
	}

	h.mu.RLock()
	connections := make([]*clientConn, len(h.roomConnections[roomID]))
	copy(connections, h.roomConnections[roomID])
	h.mu.RUnlock()

	// Non-blocking enqueue: a slow client cannot stall the broadcast.
	for _, client := range connections {
		client.enqueue(data)
	}
}

// sendMessage marshals and enqueues a message to a single client.
func sendMessage(client *clientConn, msg WebSocketMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return
	}
	client.enqueue(data)
}

// writeDirect writes a single message synchronously with a deadline. Used only
// for the pre-registration error path, where the writePump has not started yet.
func writeDirect(ws *websocket.Conn, msg WebSocketMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	ws.SetWriteDeadline(time.Now().Add(writeWait))
	if err := ws.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("WebSocket direct write error: %v", err)
	}
}
