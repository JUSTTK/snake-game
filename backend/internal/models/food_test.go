package models

import (
	"testing"
)

func TestNewFood(t *testing.T) {
	pos := Point{X: 5, Y: 3}
	food := NewFood(pos, NormalFood)
	if food.Pos != pos {
		t.Errorf("expected pos %v, got %v", pos, food.Pos)
	}
	if food.Type != NormalFood {
		t.Errorf("expected type NORMAL, got %s", food.Type)
	}
	if food.ID == "" {
		t.Error("expected non-empty food ID")
	}
}

func TestGenerateRandomFood(t *testing.T) {
	mapSize := Point{X: 20, Y: 15}
	occupied := []Point{{X: 0, Y: 0}}

	food := GenerateRandomFood(mapSize, occupied)
	if food == nil {
		t.Fatal("expected non-nil food")
	}
	if food.Pos.X < 0 || food.Pos.X >= mapSize.X {
		t.Errorf("food X out of bounds: %d", food.Pos.X)
	}
	if food.Pos.Y < 0 || food.Pos.Y >= mapSize.Y {
		t.Errorf("food Y out of bounds: %d", food.Pos.Y)
	}
}

func TestGenerateRandomFoodWithSnakeLen(t *testing.T) {
	mapSize := Point{X: 20, Y: 15}
	occupied := []Point{}

	food := GenerateRandomFoodWithSnakeLen(mapSize, occupied, 0)
	if food == nil {
		t.Fatal("expected non-nil food")
	}
	if food.Pos.X < 0 || food.Pos.X >= mapSize.X {
		t.Errorf("food X out of bounds: %d", food.Pos.X)
	}
	if food.Pos.Y < 0 || food.Pos.Y >= mapSize.Y {
		t.Errorf("food Y out of bounds: %d", food.Pos.Y)
	}
}

func TestGenerateRandomFoodWithSnakeLen_RareFood(t *testing.T) {
	mapSize := Point{X: 20, Y: 15}
	occupied := []Point{}

	foundRare := false
	for i := 0; i < 200; i++ {
		food := GenerateRandomFoodWithSnakeLen(mapSize, occupied, 10)
		if food.Type != NormalFood {
			foundRare = true
			break
		}
	}
	if !foundRare {
		t.Error("expected to find at least one rare food in 200 attempts with snake length 10")
	}
}

func TestGenerateRandomFoodAvoidProximity(t *testing.T) {
	mapSize := Point{X: 20, Y: 15}
	occupied := []Point{}
	snakeHeads := []Point{{X: 10, Y: 7}}

	food := GenerateRandomFoodAvoidProximity(mapSize, occupied, snakeHeads, 3)
	if food == nil {
		t.Fatal("expected non-nil food")
	}
	if food.Pos.X < 0 || food.Pos.X >= mapSize.X {
		t.Errorf("food X out of bounds: %d", food.Pos.X)
	}
	if food.Pos.Y < 0 || food.Pos.Y >= mapSize.Y {
		t.Errorf("food Y out of bounds: %d", food.Pos.Y)
	}
}

func TestPickFoodType_ZeroLength(t *testing.T) {
	foodType := pickFoodType(0)
	if foodType != NormalFood && foodType != SpecialFood {
		t.Errorf("expected NORMAL or SPECIAL for snake length 0, got %s", foodType)
	}
}

func TestPickFoodType_HighLength(t *testing.T) {
	types := make(map[FoodType]bool)
	for i := 0; i < 500; i++ {
		ft := pickFoodType(10)
		types[ft] = true
	}

	if !types[NormalFood] {
		t.Error("expected NORMAL food to appear")
	}
}

func TestFoodSpawnTable_Weights(t *testing.T) {
	totalWeight := float32(0)
	for _, cfg := range FoodSpawnTable {
		totalWeight += cfg.Weight
	}
	if totalWeight <= 0 {
		t.Errorf("expected positive total weight, got %f", totalWeight)
	}
}

func TestFoodSpawnTable_MinSnakeLen(t *testing.T) {
	for _, cfg := range FoodSpawnTable {
		if cfg.Weight <= 0 {
			t.Errorf("food type %s has non-positive weight %f", cfg.Type, cfg.Weight)
		}
	}
}
