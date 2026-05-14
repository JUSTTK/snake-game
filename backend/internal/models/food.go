package models

import (
	"math/rand"

	"github.com/google/uuid"
)

type FoodType string

const (
	NormalFood  FoodType = "NORMAL"
	SpecialFood FoodType = "SPECIAL"
	SlowFood    FoodType = "SLOW"
	ShieldFood  FoodType = "SHIELD"
	ShrinkFood  FoodType = "SHRINK"
)

type Food struct {
	ID   string   `json:"id"`
	Pos  Point    `json:"pos"`
	Type FoodType `json:"type"`
}

func NewFood(pos Point, foodType FoodType) *Food {
	return &Food{
		ID:   uuid.New().String(),
		Pos:  pos,
		Type: foodType,
	}
}

type FoodSpawnConfig struct {
	Type       FoodType
	Weight     float32
	MinSnakeLen int
}

var FoodSpawnTable = []FoodSpawnConfig{
	{Type: NormalFood, Weight: 0.55, MinSnakeLen: 0},
	{Type: SpecialFood, Weight: 0.10, MinSnakeLen: 0},
	{Type: SlowFood, Weight: 0.12, MinSnakeLen: 4},
	{Type: ShieldFood, Weight: 0.10, MinSnakeLen: 5},
	{Type: ShrinkFood, Weight: 0.13, MinSnakeLen: 6},
}

func GenerateRandomFood(mapSize Point, occupiedPoints []Point) *Food {
	return GenerateRandomFoodWithSnakeLen(mapSize, occupiedPoints, 0)
}

func GenerateRandomFoodWithSnakeLen(mapSize Point, occupiedPoints []Point, maxSnakeLen int) *Food {
	for {
		pos := Point{
			X: rand.Intn(mapSize.X),
			Y: rand.Intn(mapSize.Y),
		}

		occupied := false
		for _, p := range occupiedPoints {
			if p == pos {
				occupied = true
				break
			}
		}

		if !occupied {
			foodType := pickFoodType(maxSnakeLen)
			return NewFood(pos, foodType)
		}
	}
}

func GenerateRandomFoodAvoidProximity(mapSize Point, occupiedPoints []Point, snakeHeads []Point, minDistance int) *Food {
	maxSnakeLen := 0
	_ = maxSnakeLen

	for attempt := 0; attempt < 50; attempt++ {
		pos := Point{
			X: rand.Intn(mapSize.X),
			Y: rand.Intn(mapSize.Y),
		}

		occupied := false
		for _, p := range occupiedPoints {
			if p == pos {
				occupied = true
				break
			}
		}
		if occupied {
			continue
		}

		if minDistance > 0 {
			tooClose := false
			for _, head := range snakeHeads {
				dx := pos.X - head.X
				dy := pos.Y - head.Y
				if dx*dx+dy*dy < minDistance*minDistance {
					tooClose = true
					break
				}
			}
			if tooClose && attempt < 40 {
				continue
			}
		}

		foodType := pickFoodType(0)
		return NewFood(pos, foodType)
	}

	pos := Point{
		X: rand.Intn(mapSize.X),
		Y: rand.Intn(mapSize.Y),
	}
	return NewFood(pos, NormalFood)
}

func pickFoodType(maxSnakeLen int) FoodType {
	var totalWeight float32
	for _, cfg := range FoodSpawnTable {
		if maxSnakeLen >= cfg.MinSnakeLen || cfg.MinSnakeLen == 0 {
			totalWeight += cfg.Weight
		}
	}

	roll := rand.Float32() * totalWeight
	var cumulative float32
	for _, cfg := range FoodSpawnTable {
		if maxSnakeLen >= cfg.MinSnakeLen || cfg.MinSnakeLen == 0 {
			cumulative += cfg.Weight
			if roll <= cumulative {
				return cfg.Type
			}
		}
	}

	return NormalFood
}
