package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"snake-game/internal/services"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func setupRouter() (*gin.Engine, *services.GameService) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	gs := services.NewGameService()
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

func TestClientConn_WriteMessage_Concurrent(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader.Upgrade(w, r, nil)
	}))
	defer s.Close()

	wsURL := "ws" + s.URL[4:]
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Skipf("cannot create websocket connection: %v", err)
	}
	defer ws.Close()

	client := &clientConn{conn: ws}

	done := make(chan bool, 2)
	go func() {
		client.writeMessage(websocket.TextMessage, []byte(`{"type":"PING"}`))
		done <- true
	}()
	go func() {
		client.writeMessage(websocket.TextMessage, []byte(`{"type":"PONG"}`))
		done <- true
	}()

	<-done
	<-done
}
