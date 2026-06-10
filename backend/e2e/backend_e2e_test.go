package e2e_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"snake-game/internal/handlers"
	"snake-game/internal/services"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type apiResponse map[string]interface{}

func newE2EServer(t *testing.T) *httptest.Server {
	t.Helper()

	gin.SetMode(gin.TestMode)
	gameService := services.NewGameService()
	roomHandler := handlers.NewRoomHandler(gameService)
	webSocketHandler := handlers.NewHTTPWebSocketHandler(gameService)

	router := gin.New()
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	rooms := router.Group("/api/rooms")
	{
		rooms.GET("", roomHandler.GetRooms)
		rooms.POST("", roomHandler.CreateRoom)
		rooms.POST("/:id/join", roomHandler.JoinRoom)
	}
	router.GET("/ws", webSocketHandler.HandleWebSocket)

	return httptest.NewServer(router)
}

func decodeJSON(t *testing.T, resp *http.Response) apiResponse {
	t.Helper()
	defer resp.Body.Close()

	var body apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response JSON: %v", err)
	}
	return body
}

func TestBackendE2EHealthAndRoomLifecycle(t *testing.T) {
	server := newE2EServer(t)
	defer server.Close()

	resp, err := http.Get(server.URL + "/health")
	if err != nil {
		t.Fatalf("health request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected health status 200, got %d", resp.StatusCode)
	}
	health := decodeJSON(t, resp)
	if health["status"] != "ok" {
		t.Fatalf("expected health status ok, got %v", health["status"])
	}

	createBody := bytes.NewBufferString(`{"name":"e2e-room"}`)
	resp, err = http.Post(server.URL+"/api/rooms", "application/json", createBody)
	if err != nil {
		t.Fatalf("create room request failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected create room status 201, got %d", resp.StatusCode)
	}
	created := decodeJSON(t, resp)
	room, ok := created["room"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected room object in response, got %v", created["room"])
	}
	roomID, ok := room["id"].(string)
	if !ok || roomID == "" {
		t.Fatalf("expected room id in response, got %v", room["id"])
	}

	joinPayload := bytes.NewBufferString(`{"player_id":"player-1","player_name":"E2E Player"}`)
	resp, err = http.Post(server.URL+"/api/rooms/"+roomID+"/join", "application/json", joinPayload)
	if err != nil {
		t.Fatalf("join room request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected join room status 200, got %d", resp.StatusCode)
	}
	joined := decodeJSON(t, resp)
	if joined["message"] != "Successfully joined room" {
		t.Fatalf("expected join success message, got %v", joined["message"])
	}
	if _, ok := joined["snake"].(map[string]interface{}); !ok {
		t.Fatalf("expected snake object in join response, got %v", joined["snake"])
	}

	resp, err = http.Get(server.URL + "/api/rooms")
	if err != nil {
		t.Fatalf("list rooms request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected list rooms status 200, got %d", resp.StatusCode)
	}
	listed := decodeJSON(t, resp)
	rooms, ok := listed["rooms"].([]interface{})
	if !ok || len(rooms) != 1 {
		t.Fatalf("expected one room in list response, got %v", listed["rooms"])
	}
}

func TestBackendE2EWebSocketValidationAndPing(t *testing.T) {
	server := newE2EServer(t)
	defer server.Close()

	resp, err := http.Get(server.URL + "/ws")
	if err != nil {
		t.Fatalf("websocket validation request failed: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected missing websocket query status 400, got %d", resp.StatusCode)
	}
	_ = decodeJSON(t, resp)

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	query := url.Values{}
	query.Set("room_id", "e2e-ws-room")
	query.Set("player_id", "player-1")
	query.Set("player_name", "E2E Player")

	conn, _, err := websocket.DefaultDialer.Dial(wsURL+"?"+query.Encode(), nil)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	if err := conn.SetReadDeadline(time.Now().Add(2 * time.Second)); err != nil {
		t.Fatalf("failed to set websocket read deadline: %v", err)
	}
	var initial handlers.WebSocketMessage
	if err := conn.ReadJSON(&initial); err != nil {
		t.Fatalf("failed to read initial websocket message: %v", err)
	}
	if initial.Type != "GAME_STATE" {
		t.Fatalf("expected initial GAME_STATE message, got %s", initial.Type)
	}

	if err := conn.WriteJSON(handlers.WebSocketMessage{Type: "PING"}); err != nil {
		t.Fatalf("failed to send websocket ping: %v", err)
	}

	if err := conn.SetReadDeadline(time.Now().Add(2 * time.Second)); err != nil {
		t.Fatalf("failed to set websocket read deadline: %v", err)
	}
	var pong handlers.WebSocketMessage
	if err := conn.ReadJSON(&pong); err != nil {
		t.Fatalf("failed to read websocket pong: %v", err)
	}
	if pong.Type != "PONG" || pong.Data != "pong" {
		t.Fatalf("expected PONG response, got type=%s data=%v", pong.Type, pong.Data)
	}
}
