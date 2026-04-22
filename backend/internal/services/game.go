package services

import (
	"log"
	"math/rand"
	"snake-game/internal/models"
	"sync"
	"time"
)

type GameService struct {
	rooms               map[string]*models.Room
	roomMutex           sync.RWMutex
	config              *GameConfig
	stateUpdateCallback func(roomID string)
	gameLoopCancellers  map[string]chan struct{}
	loopMutex           sync.RWMutex
}

type GameConfig struct {
	UpdateInterval int
	MaxPlayers     int
	MapWidth       int
	MapHeight      int
}

func NewGameService() *GameService {
	return &GameService{
		rooms:              make(map[string]*models.Room),
		gameLoopCancellers: make(map[string]chan struct{}),
		config: &GameConfig{
			UpdateInterval: 150,
			MaxPlayers:     4,
			MapWidth:       20,
			MapHeight:      15,
		},
	}
}

func (gs *GameService) SetStateUpdateCallback(callback func(roomID string)) {
	gs.stateUpdateCallback = callback
}

func (gs *GameService) stopGameLoop(roomID string) {
	gs.loopMutex.Lock()
	defer gs.loopMutex.Unlock()

	if cancel, exists := gs.gameLoopCancellers[roomID]; exists {
		close(cancel)
		delete(gs.gameLoopCancellers, roomID)
	}
}

func (gs *GameService) CreateRoom(name string) *models.Room {
	room := models.NewRoom(name)
	gs.roomMutex.Lock()
	gs.rooms[room.ID] = room
	gs.roomMutex.Unlock()
	return room
}

func (gs *GameService) CreateRoomWithID(roomID, name string) *models.Room {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	if room, exists := gs.rooms[roomID]; exists {
		return room
	}

	room := models.NewRoomWithID(roomID, name)
	gs.rooms[roomID] = room
	return room
}

func (gs *GameService) GetRoom(roomID string) (*models.Room, bool) {
	gs.roomMutex.RLock()
	defer gs.roomMutex.RUnlock()

	room, exists := gs.rooms[roomID]
	return room, exists
}

func (gs *GameService) AddPlayerToRoom(roomID, playerID, playerName string) (*models.Snake, bool) {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists {
		return nil, false
	}

	startPos, direction := gs.findStartPosition(len(room.Players))
	body := gs.buildInitialBody(startPos, direction)
	snake := models.NewSnakeWithBody(playerID, playerName, body, direction)

	if room.AddPlayer(snake) {
		return snake, true
	}

	return nil, false
}

func (gs *GameService) RemovePlayerFromRoom(roomID, playerID string) {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	if room, exists := gs.rooms[roomID]; exists {
		room.RemovePlayer(playerID)
		if len(room.Players) == 0 {
			gs.stopGameLoop(roomID)
		}
	}
}

func (gs *GameService) MoveSnake(roomID, playerID string, direction models.Direction) bool {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists || room.GameState != models.Playing {
		return false
	}

	snake := room.GetSnake(playerID)
	if snake == nil {
		snake = room.GetSnakeByID(playerID)
	}
	if snake == nil || !snake.Alive {
		return false
	}

	// Multiplayer uses an auto-running loop. MOVE only changes heading.
	snake.ChangeDirection(direction)
	room.UpdatedAt = time.Now()
	return true
}

func (gs *GameService) StartGame(roomID string) bool {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists {
		log.Printf("StartGame failed: room %s not found", roomID)
		return false
	}
	if room.GameState != models.Waiting {
		log.Printf("StartGame failed: room %s is not in WAITING state, current: %s", roomID, room.GameState)
		return false
	}
	if !room.CheckAllPlayersReady() {
		log.Printf("StartGame failed: not all players ready (need at least 2 players, have %d)", len(room.Players))
		return false
	}

	room.GameState = models.Playing
	room.GameStartTime = new(time.Time)
	*room.GameStartTime = time.Now()
	if len(room.Foods) == 0 {
		gs.generateFood(room)
	}

	log.Printf("Starting game for room %s with %d players", roomID, len(room.Players))

	// Ensure no stale loop remains before starting a new one.
	gs.stopGameLoop(roomID)
	cancel := make(chan struct{})
	gs.loopMutex.Lock()
	gs.gameLoopCancellers[roomID] = cancel
	gs.loopMutex.Unlock()

	go gs.gameLoop(roomID, cancel)
	return true
}

func (gs *GameService) PauseGame(roomID string) bool {
	gs.stopGameLoop(roomID)

	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists || room.GameState != models.Playing {
		return false
	}

	room.GameState = models.Paused
	room.UpdatedAt = time.Now()
	return true
}

func (gs *GameService) ResumeGame(roomID string) bool {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists || room.GameState != models.Paused {
		return false
	}

	room.GameState = models.Playing
	room.UpdatedAt = time.Now()

	cancel := make(chan struct{})
	gs.loopMutex.Lock()
	gs.gameLoopCancellers[roomID] = cancel
	gs.loopMutex.Unlock()

	go gs.gameLoop(roomID, cancel)
	return true
}

func (gs *GameService) RestartGame(roomID string) bool {
	log.Printf("RestartGame called for room %s", roomID)
	gs.stopGameLoop(roomID)

	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists {
		log.Printf("RestartGame failed: room %s not found", roomID)
		return false
	}

	room.GameState = models.Waiting
	room.UpdatedAt = time.Now()
	room.GameStartTime = nil
	room.GameEndTime = nil
	room.Foods = make([]*models.Food, 0)

	for i, snake := range room.Players {
		startPos, direction := gs.findStartPosition(i)
		snake.Body = gs.buildInitialBody(startPos, direction)
		snake.Alive = true
		snake.Score = 0
		snake.Direction = direction
		room.Players[i] = snake
	}

	log.Printf("RestartGame completed for room %s", roomID)
	return true
}

func (gs *GameService) gameLoop(roomID string, cancel <-chan struct{}) {
	ticker := time.NewTicker(time.Duration(gs.config.UpdateInterval) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			gameOver := gs.updateGameState(roomID)
			if gameOver {
				gs.stopGameLoop(roomID)
				return
			}
		case <-cancel:
			return
		}
	}
}

func (gs *GameService) updateGameState(roomID string) bool {
	gs.roomMutex.Lock()

	room, exists := gs.rooms[roomID]
	if !exists || room.GameState != models.Playing {
		gs.roomMutex.Unlock()
		return false
	}

	for _, snake := range room.Players {
		if snake.Alive {
			snake.Move()
		}
	}

	gs.checkCollisions(room)
	if rand.Float32() < 0.02 {
		gs.generateFood(room)
	}

	gameOver := room.CheckGameOver()
	room.UpdatedAt = time.Now()
	gs.roomMutex.Unlock()

	// Broadcast after unlocking so the callback can safely read room state.
	if gs.stateUpdateCallback != nil {
		gs.stateUpdateCallback(roomID)
	}

	return gameOver
}

func (gs *GameService) checkCollisions(room *models.Room) {
	occupiedPoints := make(map[models.Point]bool)

	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}

		head := snake.Body[0]
		if head.X < 0 || head.X >= room.MapSize.X || head.Y < 0 || head.Y >= room.MapSize.Y {
			snake.Alive = false
			continue
		}
		if snake.CheckSelfCollision() {
			snake.Alive = false
			continue
		}
		if occupiedPoints[head] {
			snake.Alive = false
			continue
		}

		occupiedPoints[head] = true
	}

	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}

		for i, food := range room.Foods {
			if snake.Body[0] == food.Pos {
				snake.Grow()
				room.Foods = append(room.Foods[:i], room.Foods[i+1:]...)
				break
			}
		}
	}
}

func (gs *GameService) generateFood(room *models.Room) {
	occupiedPoints := make([]models.Point, 0)

	for _, snake := range room.Players {
		occupiedPoints = append(occupiedPoints, snake.Body...)
	}
	for _, food := range room.Foods {
		occupiedPoints = append(occupiedPoints, food.Pos)
	}

	food := models.GenerateRandomFood(room.MapSize, occupiedPoints)
	room.Foods = append(room.Foods, food)
}

func (gs *GameService) buildInitialBody(startPos models.Point, direction models.Direction) []models.Point {
	switch direction {
	case models.Right:
		return []models.Point{
			startPos,
			{X: startPos.X - 1, Y: startPos.Y},
			{X: startPos.X - 2, Y: startPos.Y},
		}
	case models.Left:
		return []models.Point{
			startPos,
			{X: startPos.X + 1, Y: startPos.Y},
			{X: startPos.X + 2, Y: startPos.Y},
		}
	case models.Up:
		return []models.Point{
			startPos,
			{X: startPos.X, Y: startPos.Y + 1},
			{X: startPos.X, Y: startPos.Y + 2},
		}
	default:
		return []models.Point{
			startPos,
			{X: startPos.X, Y: startPos.Y - 1},
			{X: startPos.X, Y: startPos.Y - 2},
		}
	}
}

func (gs *GameService) findStartPosition(playerIndex int) (models.Point, models.Direction) {
	positions := []models.Point{
		{X: 5, Y: 7},
		{X: 14, Y: 7},
		{X: 5, Y: 3},
		{X: 14, Y: 11},
	}
	directions := []models.Direction{
		models.Right,
		models.Left,
		models.Right,
		models.Left,
	}

	if playerIndex >= len(positions) {
		playerIndex = len(positions) - 1
	}
	return positions[playerIndex], directions[playerIndex]
}

func (gs *GameService) GetRooms() []*models.Room {
	gs.roomMutex.RLock()
	defer gs.roomMutex.RUnlock()

	rooms := make([]*models.Room, 0, len(gs.rooms))
	for _, room := range gs.rooms {
		rooms = append(rooms, room)
	}
	return rooms
}
