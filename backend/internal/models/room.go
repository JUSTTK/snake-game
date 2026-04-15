package models

import (
	"time"
	"github.com/google/uuid"
)

type GameState string

const (
	Waiting  GameState = "WAITING"
	Playing  GameState = "PLAYING"
	Paused   GameState = "PAUSED"
	Finished GameState = "FINISHED"
)

type Room struct {
	ID            string      `json:"id"`
	Name          string      `json:"name"`
	GameState     GameState   `json:"game_state"`
	Players       []*Snake    `json:"players"`
	Foods         []*Food     `json:"foods"`
	MapSize       Point       `json:"map_size"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
	GameStartTime *time.Time  `json:"game_start_time"`
	GameEndTime   *time.Time  `json:"game_end_time"`
}

func NewRoom(name string) *Room {
	return &Room{
		ID:        uuid.New().String(),
		Name:      name,
		GameState: Waiting,
		Players:   make([]*Snake, 0),
		Foods:     make([]*Food, 0),
		MapSize:   Point{X: 20, Y: 15},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func NewRoomWithID(id, name string) *Room {
	room := NewRoom(name)
	room.ID = id
	return room
}

func (r *Room) AddPlayer(snake *Snake) bool {
	if len(r.Players) >= 4 { // 最多4个玩家
		return false
	}

	r.Players = append(r.Players, snake)
	r.UpdatedAt = time.Now()
	return true
}

func (r *Room) RemovePlayer(playerID string) {
	for i, player := range r.Players {
		if player.PlayerID == playerID {
			r.Players = append(r.Players[:i], r.Players[i+1:]...)
			r.UpdatedAt = time.Now()
			return
		}
	}
}

func (r *Room) GetSnake(playerID string) *Snake {
	for _, player := range r.Players {
		if player.PlayerID == playerID {
			return player
		}
	}
	return nil
}

func (r *Room) GetSnakeByID(snakeID string) *Snake {
	for _, player := range r.Players {
		if player.ID == snakeID {
			return player
		}
	}
	return nil
}

func (r *Room) GetPlayerCount() int {
	return len(r.Players)
}

func (r *Room) CheckAllPlayersReady() bool {
	if len(r.Players) < 2 {
		return false
	}
	for _, player := range r.Players {
		if !player.Alive {
			return false
		}
	}
	return true
}

func (r *Room) GetAlivePlayers() []*Snake {
	alive := make([]*Snake, 0)
	for _, player := range r.Players {
		if player.Alive {
			alive = append(alive, player)
		}
	}
	return alive
}

func (r *Room) CheckGameOver() bool {
	alivePlayers := r.GetAlivePlayers()
	if len(alivePlayers) <= 1 {
		r.GameState = Finished
		r.GameEndTime = new(time.Time)
		*r.GameEndTime = time.Now()
		return true
	}
	return false
}
