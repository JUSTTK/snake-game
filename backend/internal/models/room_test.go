package models

import (
	"testing"
)

func TestNewRoom(t *testing.T) {
	room := NewRoom("test-room", 20, 15)
	if room.Name != "test-room" {
		t.Errorf("expected room name 'test-room', got '%s'", room.Name)
	}
	if room.GameState != Waiting {
		t.Errorf("expected initial state WAITING, got %s", room.GameState)
	}
	if room.ID == "" {
		t.Error("expected non-empty room ID")
	}
	if len(room.Players) != 0 {
		t.Errorf("expected 0 players, got %d", len(room.Players))
	}
	if len(room.Foods) != 0 {
		t.Errorf("expected 0 foods, got %d", len(room.Foods))
	}
	if room.MapSize.X != 20 || room.MapSize.Y != 15 {
		t.Errorf("expected map size 20x15, got %dx%d", room.MapSize.X, room.MapSize.Y)
	}
}

func TestNewRoomWithID(t *testing.T) {
	room := NewRoomWithID("custom-id", "my-room", 20, 15)
	if room.ID != "custom-id" {
		t.Errorf("expected ID 'custom-id', got '%s'", room.ID)
	}
	if room.Name != "my-room" {
		t.Errorf("expected name 'my-room', got '%s'", room.Name)
	}
}

func TestRoom_AddPlayer(t *testing.T) {
	room := NewRoom("test", 20, 15)

	snake1 := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	if !room.AddPlayer(snake1, 4) {
		t.Error("expected AddPlayer to succeed")
	}
	if len(room.Players) != 1 {
		t.Errorf("expected 1 player, got %d", len(room.Players))
	}

	snake2 := NewSnake("p2", "Player 2", Point{X: 14, Y: 7})
	if !room.AddPlayer(snake2, 4) {
		t.Error("expected AddPlayer for second player to succeed")
	}
	if len(room.Players) != 2 {
		t.Errorf("expected 2 players, got %d", len(room.Players))
	}
}

func TestRoom_AddPlayer_MaxPlayers(t *testing.T) {
	room := NewRoom("test", 20, 15)

	for i := 0; i < 4; i++ {
		snake := NewSnake("p"+string(rune('0'+i)), "Player", Point{X: i, Y: 0})
		if !room.AddPlayer(snake, 4) {
			t.Errorf("expected AddPlayer %d to succeed", i)
		}
	}

	snake5 := NewSnake("p5", "Player 5", Point{X: 0, Y: 0})
	if room.AddPlayer(snake5, 4) {
		t.Error("expected AddPlayer to fail when room is full")
	}
}

func TestRoom_RemovePlayer(t *testing.T) {
	room := NewRoom("test", 20, 15)
	snake1 := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	snake2 := NewSnake("p2", "Player 2", Point{X: 14, Y: 7})
	room.AddPlayer(snake1, 4)
	room.AddPlayer(snake2, 4)

	room.RemovePlayer("p1")
	if len(room.Players) != 1 {
		t.Errorf("expected 1 player after removal, got %d", len(room.Players))
	}
	if room.Players[0].PlayerID != "p2" {
		t.Errorf("expected remaining player to be p2, got %s", room.Players[0].PlayerID)
	}
}

func TestRoom_RemovePlayer_NotFound(t *testing.T) {
	room := NewRoom("test", 20, 15)
	snake := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	room.AddPlayer(snake, 4)

	room.RemovePlayer("nonexistent")
	if len(room.Players) != 1 {
		t.Errorf("expected 1 player (nothing removed), got %d", len(room.Players))
	}
}

func TestRoom_GetSnake(t *testing.T) {
	room := NewRoom("test", 20, 15)
	snake := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	room.AddPlayer(snake, 4)

	found := room.GetSnake("p1")
	if found == nil {
		t.Error("expected to find snake by PlayerID")
	}
	if found.PlayerID != "p1" {
		t.Errorf("expected PlayerID 'p1', got '%s'", found.PlayerID)
	}

	notFound := room.GetSnake("nonexistent")
	if notFound != nil {
		t.Error("expected nil for nonexistent PlayerID")
	}
}

func TestRoom_GetSnakeByID(t *testing.T) {
	room := NewRoom("test", 20, 15)
	snake := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	room.AddPlayer(snake, 4)

	found := room.GetSnakeByID(snake.ID)
	if found == nil {
		t.Error("expected to find snake by ID")
	}

	notFound := room.GetSnakeByID("nonexistent")
	if notFound != nil {
		t.Error("expected nil for nonexistent ID")
	}
}

func TestRoom_CheckAllPlayersReady(t *testing.T) {
	room := NewRoom("test", 20, 15)

	if room.CheckAllPlayersReady() {
		t.Error("expected CheckAllPlayersReady to be false with 0 players")
	}

	snake1 := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	room.AddPlayer(snake1, 4)
	if room.CheckAllPlayersReady() {
		t.Error("expected CheckAllPlayersReady to be false with 1 player")
	}

	snake2 := NewSnake("p2", "Player 2", Point{X: 14, Y: 7})
	room.AddPlayer(snake2, 4)
	if !room.CheckAllPlayersReady() {
		t.Error("expected CheckAllPlayersReady to be true with 2 alive players")
	}

	snake1.Alive = false
	if room.CheckAllPlayersReady() {
		t.Error("expected CheckAllPlayersReady to be false with 1 dead player")
	}
}

func TestRoom_CheckGameOver(t *testing.T) {
	room := NewRoom("test", 20, 15)
	snake1 := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	snake2 := NewSnake("p2", "Player 2", Point{X: 14, Y: 7})
	room.AddPlayer(snake1, 4)
	room.AddPlayer(snake2, 4)

	if room.CheckGameOver() {
		t.Error("expected CheckGameOver to be false with 2 alive players")
	}

	snake1.Alive = false
	if !room.CheckGameOver() {
		t.Error("expected CheckGameOver to be true with 1 alive player")
	}
	if room.GameState != Finished {
		t.Errorf("expected GameState FINISHED, got %s", room.GameState)
	}
}

func TestRoom_GetAlivePlayers(t *testing.T) {
	room := NewRoom("test", 20, 15)
	snake1 := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	snake2 := NewSnake("p2", "Player 2", Point{X: 14, Y: 7})
	snake3 := NewSnake("p3", "Player 3", Point{X: 5, Y: 3})
	room.AddPlayer(snake1, 4)
	room.AddPlayer(snake2, 4)
	room.AddPlayer(snake3, 4)

	alive := room.GetAlivePlayers()
	if len(alive) != 3 {
		t.Errorf("expected 3 alive players, got %d", len(alive))
	}

	snake2.Alive = false
	alive = room.GetAlivePlayers()
	if len(alive) != 2 {
		t.Errorf("expected 2 alive players, got %d", len(alive))
	}
}

func TestRoom_GetPlayerCount(t *testing.T) {
	room := NewRoom("test", 20, 15)
	if room.GetPlayerCount() != 0 {
		t.Errorf("expected 0 players, got %d", room.GetPlayerCount())
	}

	snake := NewSnake("p1", "Player 1", Point{X: 5, Y: 7})
	room.AddPlayer(snake, 4)
	if room.GetPlayerCount() != 1 {
		t.Errorf("expected 1 player, got %d", room.GetPlayerCount())
	}
}
