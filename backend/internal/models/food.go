package models

import (
	"math/rand"
	//"strconv"
	"github.com/google/uuid"
)

type FoodType string

const (
	NormalFood FoodType = "normal"
	SpeedFood  FoodType = "speed"
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

func GenerateRandomFood(mapSize Point, occupiedPoints []Point) *Food {
	for {
		pos := Point{
			X: rand.Intn(mapSize.X),
			Y: rand.Intn(mapSize.Y),
		}

		// 检查位置是否被占用
		occupied := false
		for _, p := range occupiedPoints {
			if p == pos {
				occupied = true
				break
			}
		}

		if !occupied {
			// 10%概率生成加速食物
			foodType := NormalFood
			if rand.Float32() < 0.1 {
				foodType = SpeedFood
			}
			return NewFood(pos, foodType)
		}
	}
}
