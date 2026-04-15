package services

import (
	"math/rand"
	"snake-game/internal/models"
	"sync"
	"time"
)

type GameService struct {
	rooms     map[string]*models.Room
	roomMutex sync.RWMutex
	config    *GameConfig
}

type GameConfig struct {
	UpdateInterval int
	MaxPlayers     int
	MapWidth       int
	MapHeight      int
}

func NewGameService() *GameService {
	return &GameService{
		rooms: make(map[string]*models.Room),
		config: &GameConfig{
			UpdateInterval: 100, // 100ms
			MaxPlayers:     4,
			MapWidth:       20,
			MapHeight:      15,
		},
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

	// 找一个起始位置
	startPos := gs.findStartPosition(room)
	snake := models.NewSnake(playerID, playerName, startPos)

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
		// allow control by snake ID as well
		snake = room.GetSnakeByID(playerID)
	}
	if snake == nil || !snake.Alive {
		return false
	}

	snake.ChangeDirection(direction)
	snake.Move()
	gs.checkCollisions(room)
	if len(room.Foods) == 0 {
		gs.generateFood(room)
	}
	room.CheckGameOver()
	room.UpdatedAt = time.Now()

	return true
}

func (gs *GameService) StartGame(roomID string) bool {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists || room.GameState != models.Waiting {
		return false
	}

	if !room.CheckAllPlayersReady() {
		return false
	}

	room.GameState = models.Playing
	room.GameStartTime = new(time.Time)
	*room.GameStartTime = time.Now()

	// 生成初始食物
	gs.generateFood(room)

	// 启动游戏循环
	return true
}

// PauseGame 暂停游戏
func (gs *GameService) PauseGame(roomID string) bool {
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

// ResumeGame 恢复游戏
func (gs *GameService) ResumeGame(roomID string) bool {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists || room.GameState != models.Paused {
		return false
	}

	room.GameState = models.Playing
	room.UpdatedAt = time.Now()
	return true
}

// RestartGame 重新开始游戏
func (gs *GameService) RestartGame(roomID string) bool {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists {
		return false
	}

	// 重置游戏状态为等待中
	room.GameState = models.Waiting
	room.UpdatedAt = time.Now()

	// 重置所有玩家的蛇（重置到初始位置和状态）
	for i, snake := range room.Players {
		// 为每个玩家重新分配起始位置
		startPos := gs.findStartPosition(room)
		snake.Body = []models.Point{startPos}
		snake.Alive = true
		snake.Score = 0
		room.Players[i] = snake
	}

	// 清空食物
	room.Foods = make([]*models.Food, 0)

	// 重置游戏时间
	room.GameStartTime = nil
	room.GameEndTime = nil

	return true
}

func (gs *GameService) gameLoop(roomID string) {
	ticker := time.NewTicker(time.Duration(gs.config.UpdateInterval) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			gs.updateGameState(roomID)
		default:
		}

		// 检查游戏是否结束
		if room, exists := gs.GetRoom(roomID); exists {
			if room.CheckGameOver() {
				return
			}
		}
	}
}

func (gs *GameService) updateGameState(roomID string) {
	gs.roomMutex.Lock()
	defer gs.roomMutex.Unlock()

	room, exists := gs.rooms[roomID]
	if !exists || room.GameState != models.Playing {
		return
	}

	// 移动所有蛇
	for _, snake := range room.Players {
		if snake.Alive {
			snake.Move()
		}
	}

	// 检查碰撞
	gs.checkCollisions(room)

	// 生成新食物
	if rand.Float32() < 0.02 { // 2%概率生成新食物
		gs.generateFood(room)
	}

	room.UpdatedAt = time.Now()
}

func (gs *GameService) checkCollisions(room *models.Room) {
	occupiedPoints := make(map[models.Point]bool)

	// 检查蛇之间的碰撞
	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}

		head := snake.Body[0]

		// 检查是否撞墙
		if head.X < 0 || head.X >= room.MapSize.X || head.Y < 0 || head.Y >= room.MapSize.Y {
			snake.Alive = false
			continue
		}

		// 检查是否撞到自己
		if snake.CheckSelfCollision() {
			snake.Alive = false
			continue
		}

		// 检查是否撞到其他蛇
		if occupiedPoints[head] {
			snake.Alive = false
			continue
		}

		occupiedPoints[head] = true
	}

	// 检查是否吃到食物
	for _, snake := range room.Players {
		if !snake.Alive {
			continue
		}

		for i, food := range room.Foods {
			if snake.Body[0] == food.Pos {
				snake.Grow()
				// 移除被吃掉的食物
				room.Foods = append(room.Foods[:i], room.Foods[i+1:]...)
				break
			}
		}
	}
}

func (gs *GameService) generateFood(room *models.Room) {
	occupiedPoints := make([]models.Point, 0)

	// 收集所有蛇的位置
	for _, snake := range room.Players {
		occupiedPoints = append(occupiedPoints, snake.Body...)
	}

	// 收集所有食物的位置
	for _, food := range room.Foods {
		occupiedPoints = append(occupiedPoints, food.Pos)
	}

	food := models.GenerateRandomFood(room.MapSize, occupiedPoints)
	room.Foods = append(room.Foods, food)
}

func (gs *GameService) findStartPosition(room *models.Room) models.Point {
	// 简单的起始位置分配
	switch room.GetPlayerCount() {
	case 0:
		return models.Point{X: 5, Y: 7}
	case 1:
		return models.Point{X: 14, Y: 7}
	case 2:
		return models.Point{X: 5, Y: 3}
	default:
		return models.Point{X: 14, Y: 11}
	}
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
