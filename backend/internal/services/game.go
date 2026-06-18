package services

import (
	"log"
	"math/rand"
	"snake-game/internal/config"
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
	tickCount           int
}

type GameConfig struct {
	UpdateInterval int
	MaxPlayers     int
	MapWidth       int
	MapHeight      int
}

func NewGameService(cfg *config.Config) *GameService {
	return &GameService{
		rooms:              make(map[string]*models.Room),
		gameLoopCancellers: make(map[string]chan struct{}),
		config: &GameConfig{
			UpdateInterval: cfg.GameUpdateInterval,
			MaxPlayers:     cfg.MaxPlayersPerRoom,
			MapWidth:       cfg.MapWidth,
			MapHeight:      cfg.MapHeight,
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
	room := models.NewRoom(name, gs.config.MapWidth, gs.config.MapHeight)
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

	room := models.NewRoomWithID(roomID, name, gs.config.MapWidth, gs.config.MapHeight)
	gs.rooms[roomID] = room
	return room
}

func (gs *GameService) GetRoom(roomID string) (*models.Room, bool) {
	gs.roomMutex.RLock()
	defer gs.roomMutex.RUnlock()

	room, exists := gs.rooms[roomID]
	return room, exists
}

// GetRoomSnapshot returns a deep-copied room that is safe to read/serialize
// without holding the service lock. Call this instead of GetRoom whenever the
// caller will access room fields (Players/Foods) outside the lock — e.g. when
// JSON-marshaling for broadcasts or REST responses — to avoid slice-tearing
// races with the game loop.
func (gs *GameService) GetRoomSnapshot(roomID string) (*models.Room, bool) {
	gs.roomMutex.RLock()
	defer gs.roomMutex.RUnlock()

	room, exists := gs.rooms[roomID]
	if !exists {
		return nil, false
	}
	return cloneRoom(room), true
}

// GetRoomsSnapshot returns deep-copied snapshots of all rooms (safe to serialize).
func (gs *GameService) GetRoomsSnapshot() []*models.Room {
	gs.roomMutex.RLock()
	defer gs.roomMutex.RUnlock()

	rooms := make([]*models.Room, 0, len(gs.rooms))
	for _, room := range gs.rooms {
		rooms = append(rooms, cloneRoom(room))
	}
	return rooms
}

func cloneRoom(room *models.Room) *models.Room {
	clone := *room
	clone.Players = make([]*models.Snake, len(room.Players))
	for i, s := range room.Players {
		sc := *s
		body := make([]models.Point, len(s.Body))
		copy(body, s.Body)
		sc.Body = body
		clone.Players[i] = &sc
	}
	clone.Foods = make([]*models.Food, len(room.Foods))
	for i, f := range room.Foods {
		fc := *f
		clone.Foods[i] = &fc
	}
	return &clone
}

var playerColors = []string{"#4ade80", "#38bdf8", "#f472b6", "#facc15"}

func (gs *GameService) AddPlayerToRoom(roomID, playerID, playerName string) (*models.Snake, bool) {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists {
		return nil, false
	}

	playerIndex := len(room.Players)
	startPos, direction := gs.findStartPosition(playerIndex)
	body := gs.buildInitialBody(startPos, direction)
	snake := models.NewSnakeWithBody(playerID, playerName, body, direction)
	snake.Color = playerColors[playerIndex%len(playerColors)]

	if room.AddPlayer(snake, gs.config.MaxPlayers) {
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
			delete(gs.rooms, roomID)
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

	gs.tickCount++
	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}
		// Slowed snakes move every other tick; still tick their effect timers.
		if snake.Slowed && gs.tickCount%2 == 1 {
			snake.TickEffects()
			continue
		}
		// A shielded snake that would step out of bounds skips the move this
		// tick and consumes its shield (one-tick grace to turn away), instead
		// of advancing into an illegal out-of-bounds cell.
		if snake.Shielded && nextHeadOutOfBounds(snake, room.MapSize) {
			snake.Shielded = false
			snake.ShieldTimer = 0
			snake.TickEffects()
			continue
		}
		snake.Move()
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

func nextHeadOutOfBounds(snake *models.Snake, mapSize models.Point) bool {
	if len(snake.Body) == 0 {
		return false
	}
	head := snake.Body[0]
	switch snake.Direction {
	case models.Up:
		head.Y--
	case models.Down:
		head.Y++
	case models.Left:
		head.X--
	case models.Right:
		head.X++
	}
	return head.X < 0 || head.X >= mapSize.X || head.Y < 0 || head.Y >= mapSize.Y
}

func (gs *GameService) checkCollisions(room *models.Room) {
	// First pass: count heads and mark all non-head body segments across living snakes.
	headCount := make(map[models.Point]int)
	bodyPoints := make(map[models.Point]bool)
	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}
		headCount[snake.Body[0]]++
		for i := 1; i < len(snake.Body); i++ {
			bodyPoints[snake.Body[i]] = true
		}
	}

	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}
		head := snake.Body[0]

		// Wall collision (unshielded snakes only — shielded wall steps are
		// pre-empted in updateGameState before Move advances the head).
		if head.X < 0 || head.X >= room.MapSize.X || head.Y < 0 || head.Y >= room.MapSize.Y {
			snake.KillIfUnshielded()
			continue
		}

		// Decide collision once so a shield is consumed at most once.
		collided := false
		if snake.CheckSelfCollision() {
			collided = true
		} else if headCount[head] >= 2 {
			collided = true // head-to-head: both snakes die
		} else if bodyPoints[head] {
			collided = true // ran into another snake's body
		}
		if collided {
			snake.KillIfUnshielded()
			continue
		}
	}

	// Only living snakes may eat.
	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}

		for i, food := range room.Foods {
			if snake.Body[0] == food.Pos {
				snake.GrowWithFood(food.Type)
				room.Foods = append(room.Foods[:i], room.Foods[i+1:]...)
				break
			}
		}
	}
}

func (gs *GameService) generateFood(room *models.Room) {
	if len(room.Foods) >= 10 {
		return
	}

	occupiedPoints := make([]models.Point, 0)
	snakeHeads := make([]models.Point, 0)
	maxSnakeLen := 0

	for _, snake := range room.Players {
		occupiedPoints = append(occupiedPoints, snake.Body...)
		if len(snake.Body) > 0 {
			snakeHeads = append(snakeHeads, snake.Body[0])
		}
		if len(snake.Body) > maxSnakeLen {
			maxSnakeLen = len(snake.Body)
		}
	}
	for _, food := range room.Foods {
		occupiedPoints = append(occupiedPoints, food.Pos)
	}

	var food *models.Food
	if maxSnakeLen >= 5 {
		food = models.GenerateRandomFoodWithSnakeLen(room.MapSize, occupiedPoints, maxSnakeLen)
	} else {
		food = models.GenerateRandomFoodAvoidProximity(room.MapSize, occupiedPoints, snakeHeads, 3)
	}
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
	w := gs.config.MapWidth
	h := gs.config.MapHeight
	positions := []models.Point{
		{X: w / 4, Y: h / 2},
		{X: 3 * w / 4, Y: h / 2},
		{X: w / 4, Y: h / 4},
		{X: 3 * w / 4, Y: 3 * h / 4},
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
