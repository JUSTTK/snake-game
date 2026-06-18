package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"snake-game/internal/config"
	"snake-game/internal/services"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func setupRouter() (*gin.Engine, *services.GameService) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	gs := services.NewGameService(config.Load())
	roomHandler := NewRoomHandler(gs)

	api := r.Group("/api")
	{
		api.GET("/rooms", roomHandler.GetRooms)
		api.POST("/rooms", roomHandler.CreateRoom)
		api.POST("/rooms/:id/join", roomHandler.JoinRoom)
	}

	return r, gs
}

func TestRoomHandler_GetRooms(t *testing.T) {
	r, _ := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/rooms", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	if _, ok := response["rooms"]; !ok {
		t.Error("expected 'rooms' key in response")
	}
}

func TestRoomHandler_GetRooms_WithData(t *testing.T) {
	r, gs := setupRouter()
	gs.CreateRoom("test-room")

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/rooms", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	rooms := response["rooms"].([]interface{})
	if len(rooms) != 1 {
		t.Errorf("expected 1 room, got %d", len(rooms))
	}
}

func TestRoomHandler_CreateRoom(t *testing.T) {
	r, _ := setupRouter()

	body, _ := json.Marshal(map[string]string{"name": "new-room"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/rooms", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	if _, ok := response["room"]; !ok {
		t.Error("expected 'room' key in response")
	}
}

func TestRoomHandler_CreateRoom_MissingName(t *testing.T) {
	r, _ := setupRouter()

	body, _ := json.Marshal(map[string]string{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/rooms", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestRoomHandler_JoinRoom(t *testing.T) {
	r, gs := setupRouter()
	room := gs.CreateRoom("test-room")

	body, _ := json.Marshal(map[string]string{
		"player_id":   "p1",
		"player_name": "Player 1",
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/rooms/"+room.ID+"/join", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	if response["message"] != "Successfully joined room" {
		t.Errorf("expected success message, got %v", response["message"])
	}
}

func TestRoomHandler_JoinRoom_Full(t *testing.T) {
	r, gs := setupRouter()
	room := gs.CreateRoom("test-room")

	for i := 0; i < 4; i++ {
		pid := string(rune('1' + i))
		gs.AddPlayerToRoom(room.ID, "p"+pid, "Player "+pid)
	}

	body, _ := json.Marshal(map[string]string{
		"player_id":   "p5",
		"player_name": "Player 5",
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/rooms/"+room.ID+"/join", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for full room, got %d", w.Code)
	}
}

func TestRoomHandler_JoinRoom_MissingFields(t *testing.T) {
	r, gs := setupRouter()
	room := gs.CreateRoom("test-room")

	body, _ := json.Marshal(map[string]string{
		"player_id": "p1",
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/rooms/"+room.ID+"/join", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for missing fields, got %d", w.Code)
	}
}

func TestWebSocketMessage_Marshal(t *testing.T) {
	msg := WebSocketMessage{Type: "PING", Data: "test"}
	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var parsed WebSocketMessage
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if parsed.Type != "PING" {
		t.Errorf("expected type PING, got %s", parsed.Type)
	}
}

func TestClientConn_Enqueue_Concurrent(t *testing.T) {
	testUpgrader := websocket.Upgrader{}
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		testUpgrader.Upgrade(w, r, nil)
	}))
	defer s.Close()

	wsURL := "ws" + s.URL[4:]
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Skipf("cannot create websocket connection: %v", err)
	}
	defer ws.Close()

	client := &clientConn{
		conn:   ws,
		send:   make(chan []byte, sendBufferSize),
		done:   make(chan struct{}),
		roomID: "test",
	}

	// Concurrent enqueues must be safe; the writePump serializes actual writes.
	done := make(chan bool, 2)
	go func() {
		client.enqueue([]byte(`{"type":"PING"}`))
		done <- true
	}()
	go func() {
		client.enqueue([]byte(`{"type":"PONG"}`))
		done <- true
	}()
	<-done
	<-done
}

// T0-C: a full send buffer drops frames instead of blocking the caller.
func TestClientConn_Enqueue_DropsWhenFull(t *testing.T) {
	c := &clientConn{send: make(chan []byte, 2), done: make(chan struct{}), roomID: "r"}
	c.enqueue([]byte("a"))
	c.enqueue([]byte("b"))
	c.enqueue([]byte("c")) // full -> dropped, no panic
	c.enqueue([]byte("d")) // dropped

	if len(c.send) != 2 {
		t.Errorf("expected buffer to stay at capacity 2, got %d", len(c.send))
	}
}

// T0-C: broadcast must not block when a registered client has a full buffer.
func TestSendGameStateToRoom_DoesNotBlockOnFullBuffer(t *testing.T) {
	gs := services.NewGameService(config.Load())
	h := NewHTTPWebSocketHandler(gs, config.Load())
	room := gs.CreateRoom("slow-room")

	full := &clientConn{send: make(chan []byte, 1), done: make(chan struct{}), roomID: room.ID}
	full.enqueue([]byte("x")) // fill buffer to capacity
	h.addClient(room.ID, full)

	done := make(chan struct{})
	go func() {
		h.sendGameStateToRoom(room.ID) // enqueue hits full buffer -> drops, returns
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("sendGameStateToRoom blocked on a full-buffer client")
	}
}

// T0-A: joining a full room must not leave a stale entry in roomConnections.
func TestHandleWebSocket_FullRoomDoesNotLeakConnection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	gs := services.NewGameService(config.Load())
	h := NewHTTPWebSocketHandler(gs, config.Load())
	r := gin.New()
	r.GET("/ws", h.HandleWebSocket)
	srv := httptest.NewServer(r)
	defer srv.Close()

	roomID := "leak-room"
	gs.CreateRoomWithID(roomID, roomID)
	for i := 0; i < 4; i++ {
		gs.AddPlayerToRoom(roomID, fmt.Sprintf("p%d", i), "P")
	}

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws?room_id=" + roomID +
		"&player_id=p5&player_name=P5"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial failed: %v", err)
	}
	defer conn.Close()

	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var msg WebSocketMessage
	if err := conn.ReadJSON(&msg); err != nil {
		t.Fatalf("expected ERROR message, got read error: %v", err)
	}
	if msg.Type != "ERROR" {
		t.Errorf("expected ERROR message, got %s", msg.Type)
	}

	// Give the server a moment to finish its return path, then assert no leak.
	time.Sleep(100 * time.Millisecond)
	h.mu.RLock()
	leaked := len(h.roomConnections[roomID])
	h.mu.RUnlock()
	if leaked != 0 {
		t.Errorf("expected 0 leaked connections for full room, got %d", leaked)
	}
}
