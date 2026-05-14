package models

import (
	"log"

	"github.com/google/uuid"
)

type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Direction string

const (
	Up    Direction = "UP"
	Down  Direction = "DOWN"
	Left  Direction = "LEFT"
	Right Direction = "RIGHT"
)

type Snake struct {
	ID          string    `json:"id"`
	PlayerID    string    `json:"player_id"`
	Name        string    `json:"name"`
	Body        []Point   `json:"body"`
	Direction   Direction `json:"direction"`
	Alive       bool      `json:"alive"`
	Color       string    `json:"color"`
	Score       int       `json:"score"`
	Shielded    bool      `json:"shielded"`
	ShieldTimer int       `json:"shield_timer"`
	Slowed      bool      `json:"slowed"`
	SlowTimer   int       `json:"slow_timer"`
}

func NewSnake(playerID, name string, startPos Point) *Snake {
	return &Snake{
		ID:        uuid.New().String(),
		PlayerID:  playerID,
		Name:      name,
		Body:      []Point{startPos, {X: startPos.X - 1, Y: startPos.Y}, {X: startPos.X - 2, Y: startPos.Y}},
		Direction: Right,
		Alive:     true,
		Color:     "#4ade80",
		Score:     0,
	}
}

func NewSnakeWithBody(playerID, name string, body []Point, direction Direction) *Snake {
	return &Snake{
		ID:        uuid.New().String(),
		PlayerID:  playerID,
		Name:      name,
		Body:      body,
		Direction: direction,
		Alive:     true,
		Color:     "#4ade80",
		Score:     0,
	}
}

func (s *Snake) Move() {
	if !s.Alive {
		log.Printf("Snake %s is not alive, skipping move", s.ID)
		return
	}

	head := s.Body[0]
	newHead := Point{X: head.X, Y: head.Y}

	switch s.Direction {
	case Up:
		newHead.Y--
	case Down:
		newHead.Y++
	case Left:
		newHead.X--
	case Right:
		newHead.X++
	}

	s.Body = append([]Point{newHead}, s.Body...)
	if len(s.Body) > s.Score/10+3 {
		s.Body = s.Body[:len(s.Body)-1]
	}

	s.TickEffects()
}

func (s *Snake) ChangeDirection(newDirection Direction) {
	if (s.Direction == Up && newDirection != Down) ||
		(s.Direction == Down && newDirection != Up) ||
		(s.Direction == Left && newDirection != Right) ||
		(s.Direction == Right && newDirection != Left) {
		s.Direction = newDirection
	}
}

func (s *Snake) CheckSelfCollision() bool {
	if len(s.Body) <= 1 {
		return false
	}
	head := s.Body[0]
	for i := 1; i < len(s.Body); i++ {
		if head == s.Body[i] {
			return true
		}
	}
	return false
}

func (s *Snake) Grow() {
	s.Score += 10
}

func (s *Snake) GrowWithFood(foodType FoodType) {
	switch foodType {
	case NormalFood:
		s.Score += 10
	case SpecialFood:
		s.Score += 50
	case SlowFood:
		s.Score += 20
		s.Slowed = true
		s.SlowTimer = 30
	case ShieldFood:
		s.Score += 30
		s.Shielded = true
		s.ShieldTimer = 40
	case ShrinkFood:
		s.Score += 20
		s.Shrink()
	}
}

func (s *Snake) Shrink() {
	if len(s.Body) > 3 {
		removeCount := len(s.Body) / 3
		if removeCount < 1 {
			removeCount = 1
		}
		if len(s.Body)-removeCount < 3 {
			removeCount = len(s.Body) - 3
		}
		if removeCount > 0 {
			s.Body = s.Body[:len(s.Body)-removeCount]
		}
	}
}

func (s *Snake) TickEffects() {
	if s.ShieldTimer > 0 {
		s.ShieldTimer--
		if s.ShieldTimer <= 0 {
			s.Shielded = false
		}
	}
	if s.SlowTimer > 0 {
		s.SlowTimer--
		if s.SlowTimer <= 0 {
			s.Slowed = false
		}
	}
}

func (s *Snake) KillIfUnshielded() bool {
	if s.Shielded {
		s.Shielded = false
		s.ShieldTimer = 0
		return false
	}
	s.Alive = false
	return true
}
