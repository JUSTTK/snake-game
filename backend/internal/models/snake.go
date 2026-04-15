package models

import "github.com/google/uuid"

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
	ID       string    `json:"id"`
	PlayerID string    `json:"player_id"`
	Name     string    `json:"name"`
	Body     []Point   `json:"body"`
	Direction Direction `json:"direction"`
	Alive    bool      `json:"alive"`
	Color    string    `json:"color"`
	Score    int       `json:"score"`
}

func NewSnake(playerID, name string, startPos Point) *Snake {
	return &Snake{
		ID:       uuid.New().String(),
		PlayerID: playerID,
		Name:     name,
		Body:     []Point{startPos},
		Direction: Right,
		Alive:    true,
		Color:    "#4ade80",
		Score:    0,
	}
}

func (s *Snake) Move() {
	if !s.Alive {
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
}

func (s *Snake) ChangeDirection(newDirection Direction) {
	// 防止180度转弯
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