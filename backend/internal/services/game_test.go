package services

import (
	"snake-game/internal/models"
	"sync"
	"testing"
	"time"
)

func newTestGameService() *GameService {
	return NewGameService()
}

func TestNewGameService(t *testing.T) {
	gs := NewGameService()
	if gs == nil {
		t.Fatal("expected non-nil GameService")
	}
	if gs.config.UpdateInterval != 150 {
		t.Errorf("expected UpdateInterval 150, got %d", gs.config.UpdateInterval)
	}
	if gs.config.MaxPlayers != 4 {
		t.Errorf("expected MaxPlayers 4, got %d", gs.config.MaxPlayers)
	}
}

func TestGameService_CreateRoom(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test-room")
	if room == nil {
		t.Fatal("expected non-nil room")
	}
	if room.Name != "test-room" {
		t.Errorf("expected name 'test-room', got '%s'", room.Name)
	}

	found, exists := gs.GetRoom(room.ID)
	if !exists {
		t.Error("expected room to exist after creation")
	}
	if found.ID != room.ID {
		t.Errorf("expected room ID %s, got %s", room.ID, found.ID)
	}
}

func TestGameService_CreateRoomWithID(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoomWithID("custom-id", "my-room")
	if room.ID != "custom-id" {
		t.Errorf("expected ID 'custom-id', got '%s'", room.ID)
	}

	sameRoom := gs.CreateRoomWithID("custom-id", "another-name")
	if sameRoom.ID != room.ID {
		t.Error("expected same room returned for duplicate ID")
	}
}

func TestGameService_GetRoom_NotFound(t *testing.T) {
	gs := newTestGameService()
	_, exists := gs.GetRoom("nonexistent")
	if exists {
		t.Error("expected room not to exist")
	}
}

func TestGameService_AddPlayerToRoom(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")

	snake, ok := gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	if !ok {
		t.Fatal("expected AddPlayerToRoom to succeed")
	}
	if snake.PlayerID != "p1" {
		t.Errorf("expected PlayerID 'p1', got '%s'", snake.PlayerID)
	}
	if snake.Color != "#4ade80" {
		t.Errorf("expected first player color '#4ade80', got '%s'", snake.Color)
	}
}

func TestGameService_AddPlayerToRoom_DifferentColors(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")

	colors := []string{}
	for i := 0; i < 4; i++ {
		pid := string(rune('1' + i))
		snake, ok := gs.AddPlayerToRoom(room.ID, "p"+pid, "Player "+pid)
		if !ok {
			t.Fatalf("expected AddPlayerToRoom %d to succeed", i)
		}
		colors = append(colors, snake.Color)
	}

	if colors[0] == colors[1] {
		t.Errorf("expected different colors for different players, got %s and %s", colors[0], colors[1])
	}
	if colors[0] != "#4ade80" || colors[1] != "#38bdf8" || colors[2] != "#f472b6" || colors[3] != "#facc15" {
		t.Errorf("expected specific colors, got %v", colors)
	}
}

func TestGameService_AddPlayerToRoom_RoomFull(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")

	for i := 0; i < 4; i++ {
		pid := string(rune('1' + i))
		gs.AddPlayerToRoom(room.ID, "p"+pid, "Player "+pid)
	}

	_, ok := gs.AddPlayerToRoom(room.ID, "p5", "Player 5")
	if ok {
		t.Error("expected AddPlayerToRoom to fail when room is full")
	}
}

func TestGameService_AddPlayerToRoom_RoomNotFound(t *testing.T) {
	gs := newTestGameService()
	_, ok := gs.AddPlayerToRoom("nonexistent", "p1", "Player 1")
	if ok {
		t.Error("expected AddPlayerToRoom to fail for nonexistent room")
	}
}

func TestGameService_RemovePlayerFromRoom(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")

	gs.RemovePlayerFromRoom(room.ID, "p1")

	found, exists := gs.GetRoom(room.ID)
	if !exists {
		t.Error("expected room to still exist with 1 player")
	}
	if found.GetPlayerCount() != 1 {
		t.Errorf("expected 1 player, got %d", found.GetPlayerCount())
	}
}

func TestGameService_RemovePlayerFromRoom_EmptyRoomCleanup(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")

	gs.RemovePlayerFromRoom(room.ID, "p1")

	_, exists := gs.GetRoom(room.ID)
	if exists {
		t.Error("expected empty room to be deleted")
	}
}

func TestGameService_MoveSnake(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")
	gs.StartGame(room.ID)

	result := gs.MoveSnake(room.ID, "p1", models.Up)
	if !result {
		t.Error("expected MoveSnake to succeed during playing state")
	}

	found, _ := gs.GetRoom(room.ID)
	snake := found.GetSnake("p1")
	if snake.Direction != models.Up {
		t.Errorf("expected direction UP, got %s", snake.Direction)
	}
}

func TestGameService_MoveSnake_NotPlaying(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")

	result := gs.MoveSnake(room.ID, "p1", models.Up)
	if result {
		t.Error("expected MoveSnake to fail when game is not playing")
	}
}

func TestGameService_MoveSnake_UnknownPlayer(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")
	gs.StartGame(room.ID)

	result := gs.MoveSnake(room.ID, "unknown", models.Up)
	if result {
		t.Error("expected MoveSnake to fail for unknown player")
	}
}

func TestGameService_StartGame(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")

	result := gs.StartGame(room.ID)
	if !result {
		t.Error("expected StartGame to succeed with 2 players")
	}

	found, _ := gs.GetRoom(room.ID)
	if found.GameState != models.Playing {
		t.Errorf("expected game state PLAYING, got %s", found.GameState)
	}

	gs.stopGameLoop(room.ID)
}

func TestGameService_StartGame_NotEnoughPlayers(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")

	result := gs.StartGame(room.ID)
	if result {
		t.Error("expected StartGame to fail with only 1 player")
	}
}

func TestGameService_StartGame_AlreadyPlaying(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")
	gs.StartGame(room.ID)
	defer gs.stopGameLoop(room.ID)

	result := gs.StartGame(room.ID)
	if result {
		t.Error("expected StartGame to fail when already playing")
	}
}

func TestGameService_PauseGame(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")
	gs.StartGame(room.ID)

	result := gs.PauseGame(room.ID)
	if !result {
		t.Error("expected PauseGame to succeed")
	}

	found, _ := gs.GetRoom(room.ID)
	if found.GameState != models.Paused {
		t.Errorf("expected game state PAUSED, got %s", found.GameState)
	}
}

func TestGameService_ResumeGame(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")
	gs.StartGame(room.ID)
	gs.PauseGame(room.ID)

	result := gs.ResumeGame(room.ID)
	if !result {
		t.Error("expected ResumeGame to succeed")
	}

	found, _ := gs.GetRoom(room.ID)
	if found.GameState != models.Playing {
		t.Errorf("expected game state PLAYING, got %s", found.GameState)
	}

	gs.stopGameLoop(room.ID)
}

func TestGameService_RestartGame(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")
	gs.StartGame(room.ID)
	gs.stopGameLoop(room.ID)

	result := gs.RestartGame(room.ID)
	if !result {
		t.Error("expected RestartGame to succeed")
	}

	found, _ := gs.GetRoom(room.ID)
	if found.GameState != models.Waiting {
		t.Errorf("expected game state WAITING, got %s", found.GameState)
	}
	for _, snake := range found.Players {
		if !snake.Alive {
			t.Error("expected snake to be alive after restart")
		}
		if snake.Score != 0 {
			t.Errorf("expected score 0 after restart, got %d", snake.Score)
		}
	}
}

func TestGameService_RestartGame_RoomNotFound(t *testing.T) {
	gs := newTestGameService()
	result := gs.RestartGame("nonexistent")
	if result {
		t.Error("expected RestartGame to fail for nonexistent room")
	}
}

func TestGameService_GetRooms(t *testing.T) {
	gs := newTestGameService()
	gs.CreateRoom("room1")
	gs.CreateRoom("room2")

	rooms := gs.GetRooms()
	if len(rooms) != 2 {
		t.Errorf("expected 2 rooms, got %d", len(rooms))
	}
}

func TestGameService_SetStateUpdateCallback(t *testing.T) {
	gs := newTestGameService()
	called := false
	gs.SetStateUpdateCallback(func(roomID string) {
		called = true
	})

	room := gs.CreateRoom("test")
	gs.AddPlayerToRoom(room.ID, "p1", "Player 1")
	gs.AddPlayerToRoom(room.ID, "p2", "Player 2")
	gs.StartGame(room.ID)

	time.Sleep(300 * time.Millisecond)
	gs.stopGameLoop(room.ID)

	if !called {
		t.Error("expected state update callback to be called during game loop")
	}
}

func TestGameService_ConcurrentAccess(t *testing.T) {
	gs := newTestGameService()
	room := gs.CreateRoom("test")

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			pid := string(rune('0' + idx%4))
			gs.AddPlayerToRoom(room.ID, "p"+pid, "Player")
		}(i)
	}
	wg.Wait()

	found, exists := gs.GetRoom(room.ID)
	if !exists {
		t.Error("expected room to exist after concurrent access")
	}
	if found.GetPlayerCount() > 4 {
		t.Errorf("expected at most 4 players, got %d", found.GetPlayerCount())
	}
}

func TestGameService_findStartPosition(t *testing.T) {
	gs := newTestGameService()

	pos0, dir0 := gs.findStartPosition(0)
	if pos0.X != 5 || pos0.Y != 7 {
		t.Errorf("expected player 0 start (5,7), got (%d,%d)", pos0.X, pos0.Y)
	}
	if dir0 != models.Right {
		t.Errorf("expected direction RIGHT, got %s", dir0)
	}

	pos1, dir1 := gs.findStartPosition(1)
	if pos1.X != 14 || pos1.Y != 7 {
		t.Errorf("expected player 1 start (14,7), got (%d,%d)", pos1.X, pos1.Y)
	}
	if dir1 != models.Left {
		t.Errorf("expected direction LEFT, got %s", dir1)
	}
}

func TestGameService_buildInitialBody(t *testing.T) {
	gs := newTestGameService()

	body := gs.buildInitialBody(models.Point{X: 10, Y: 10}, models.Right)
	if len(body) != 3 {
		t.Errorf("expected body length 3, got %d", len(body))
	}
	if body[0].X != 10 || body[1].X != 9 || body[2].X != 8 {
		t.Errorf("expected body X sequence 10,9,8, got %d,%d,%d", body[0].X, body[1].X, body[2].X)
	}

	bodyUp := gs.buildInitialBody(models.Point{X: 10, Y: 10}, models.Up)
	if bodyUp[0].Y != 10 || bodyUp[1].Y != 11 || bodyUp[2].Y != 12 {
		t.Errorf("expected body Y sequence 10,11,12, got %d,%d,%d", bodyUp[0].Y, bodyUp[1].Y, bodyUp[2].Y)
	}
}
