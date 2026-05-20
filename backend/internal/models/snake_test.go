package models

import (
	"testing"
)

func TestNewSnake(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	if snake.PlayerID != "p1" {
		t.Errorf("expected PlayerID 'p1', got '%s'", snake.PlayerID)
	}
	if snake.Name != "Player 1" {
		t.Errorf("expected Name 'Player 1', got '%s'", snake.Name)
	}
	if snake.Direction != Right {
		t.Errorf("expected default direction RIGHT, got %s", snake.Direction)
	}
	if !snake.Alive {
		t.Error("expected snake to be alive initially")
	}
	if snake.Score != 0 {
		t.Errorf("expected initial score 0, got %d", snake.Score)
	}
	if len(snake.Body) != 3 {
		t.Errorf("expected initial body length 3, got %d", len(snake.Body))
	}
}

func TestNewSnakeWithBody(t *testing.T) {
	body := []Point{{X: 5, Y: 7}, {X: 4, Y: 7}, {X: 3, Y: 7}}
	snake := NewSnakeWithBody("p1", "Player 1", body, Right)
	if len(snake.Body) != 3 {
		t.Errorf("expected body length 3, got %d", len(snake.Body))
	}
	if snake.Body[0].X != 5 || snake.Body[0].Y != 7 {
		t.Errorf("expected head at (5,7), got (%d,%d)", snake.Body[0].X, snake.Body[0].Y)
	}
	if snake.Direction != Right {
		t.Errorf("expected direction RIGHT, got %s", snake.Direction)
	}
}

func TestSnake_Move(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Move()

	if snake.Body[0].X != 11 || snake.Body[0].Y != 10 {
		t.Errorf("expected head at (11,10) after moving RIGHT, got (%d,%d)", snake.Body[0].X, snake.Body[0].Y)
	}
}

func TestSnake_MoveUp(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Direction = Up
	snake.Move()

	if snake.Body[0].X != 10 || snake.Body[0].Y != 9 {
		t.Errorf("expected head at (10,9) after moving UP, got (%d,%d)", snake.Body[0].X, snake.Body[0].Y)
	}
}

func TestSnake_MoveDown(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Direction = Down
	snake.Move()

	if snake.Body[0].X != 10 || snake.Body[0].Y != 11 {
		t.Errorf("expected head at (10,11) after moving DOWN, got (%d,%d)", snake.Body[0].X, snake.Body[0].Y)
	}
}

func TestSnake_MoveLeft(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Direction = Left
	snake.Move()

	if snake.Body[0].X != 9 || snake.Body[0].Y != 10 {
		t.Errorf("expected head at (9,10) after moving LEFT, got (%d,%d)", snake.Body[0].X, snake.Body[0].Y)
	}
}

func TestSnake_MoveDead(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Alive = false
	oldBody := make([]Point, len(snake.Body))
	copy(oldBody, snake.Body)

	snake.Move()

	if snake.Body[0] != oldBody[0] {
		t.Error("expected dead snake not to move")
	}
}

func TestSnake_ChangeDirection(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})

	snake.ChangeDirection(Up)
	if snake.Direction != Up {
		t.Errorf("expected direction UP, got %s", snake.Direction)
	}

	snake.ChangeDirection(Down)
	if snake.Direction == Down {
		t.Error("expected direction change to be rejected (reverse of UP)")
	}
	if snake.Direction != Up {
		t.Errorf("expected direction to remain UP, got %s", snake.Direction)
	}
}

func TestSnake_ChangeDirection_AllReverse(t *testing.T) {
	cases := []struct {
		current  Direction
		attempt  Direction
		expected Direction
	}{
		{Up, Down, Up},
		{Down, Up, Down},
		{Left, Right, Left},
		{Right, Left, Right},
	}

	for _, tc := range cases {
		snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
		snake.Direction = tc.current
		snake.ChangeDirection(tc.attempt)
		if snake.Direction != tc.expected {
			t.Errorf("current=%s attempt=%s: expected %s, got %s", tc.current, tc.attempt, tc.expected, snake.Direction)
		}
	}
}

func TestSnake_CheckSelfCollision(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	if snake.CheckSelfCollision() {
		t.Error("expected no self collision for new snake")
	}

	snake.Body = []Point{{X: 5, Y: 5}, {X: 6, Y: 5}, {X: 5, Y: 5}}
	if !snake.CheckSelfCollision() {
		t.Error("expected self collision when head overlaps body")
	}
}

func TestSnake_CheckSelfCollision_SingleSegment(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Body = []Point{{X: 5, Y: 5}}
	if snake.CheckSelfCollision() {
		t.Error("expected no self collision for single segment")
	}
}

func TestSnake_Grow(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Grow()
	if snake.Score != 10 {
		t.Errorf("expected score 10 after Grow, got %d", snake.Score)
	}
}

func TestSnake_GrowWithFood_Normal(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.GrowWithFood(NormalFood)
	if snake.Score != 10 {
		t.Errorf("expected score 10, got %d", snake.Score)
	}
}

func TestSnake_GrowWithFood_Special(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.GrowWithFood(SpecialFood)
	if snake.Score != 50 {
		t.Errorf("expected score 50, got %d", snake.Score)
	}
}

func TestSnake_GrowWithFood_Slow(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.GrowWithFood(SlowFood)
	if snake.Score != 20 {
		t.Errorf("expected score 20, got %d", snake.Score)
	}
	if !snake.Slowed {
		t.Error("expected snake to be slowed")
	}
	if snake.SlowTimer != 30 {
		t.Errorf("expected slow timer 30, got %d", snake.SlowTimer)
	}
}

func TestSnake_GrowWithFood_Shield(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.GrowWithFood(ShieldFood)
	if snake.Score != 30 {
		t.Errorf("expected score 30, got %d", snake.Score)
	}
	if !snake.Shielded {
		t.Error("expected snake to be shielded")
	}
	if snake.ShieldTimer != 40 {
		t.Errorf("expected shield timer 40, got %d", snake.ShieldTimer)
	}
}

func TestSnake_GrowWithFood_Shrink(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Body = []Point{{X: 10, Y: 10}, {X: 9, Y: 10}, {X: 8, Y: 10}, {X: 7, Y: 10}, {X: 6, Y: 10}, {X: 5, Y: 10}}
	initialLen := len(snake.Body)

	snake.GrowWithFood(ShrinkFood)
	if snake.Score != 20 {
		t.Errorf("expected score 20, got %d", snake.Score)
	}
	if len(snake.Body) >= initialLen {
		t.Errorf("expected body to shrink, was %d now %d", initialLen, len(snake.Body))
	}
}

func TestSnake_Shrink_MinLength(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Shrink()
	if len(snake.Body) < 3 {
		t.Errorf("expected minimum body length 3, got %d", len(snake.Body))
	}
}

func TestSnake_TickEffects(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Shielded = true
	snake.ShieldTimer = 1
	snake.Slowed = true
	snake.SlowTimer = 1

	snake.TickEffects()

	if snake.Shielded {
		t.Error("expected shield to expire after timer reaches 0")
	}
	if snake.Slowed {
		t.Error("expected slow to expire after timer reaches 0")
	}
}

func TestSnake_TickEffects_Decrement(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Shielded = true
	snake.ShieldTimer = 5
	snake.Slowed = true
	snake.SlowTimer = 3

	snake.TickEffects()

	if snake.ShieldTimer != 4 {
		t.Errorf("expected shield timer 4, got %d", snake.ShieldTimer)
	}
	if snake.SlowTimer != 2 {
		t.Errorf("expected slow timer 2, got %d", snake.SlowTimer)
	}
	if !snake.Shielded || !snake.Slowed {
		t.Error("expected effects to still be active")
	}
}

func TestSnake_KillIfUnshielded(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	result := snake.KillIfUnshielded()
	if !result {
		t.Error("expected KillIfUnshielded to return true for unshielded snake")
	}
	if snake.Alive {
		t.Error("expected snake to be dead")
	}
}

func TestSnake_KillIfShielded(t *testing.T) {
	snake := NewSnake("p1", "Player 1", Point{X: 10, Y: 10})
	snake.Shielded = true
	snake.ShieldTimer = 10

	result := snake.KillIfUnshielded()
	if result {
		t.Error("expected KillIfUnshielded to return false for shielded snake")
	}
	if !snake.Alive {
		t.Error("expected shielded snake to stay alive")
	}
	if snake.Shielded {
		t.Error("expected shield to be consumed")
	}
	if snake.ShieldTimer != 0 {
		t.Errorf("expected shield timer 0, got %d", snake.ShieldTimer)
	}
}
