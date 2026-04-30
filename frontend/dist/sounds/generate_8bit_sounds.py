#!/usr/bin/env python3
"""
生成 8-bit 复古风格音效文件
"""
import wave
import struct
import math
import random

def generate_square_wave(t, frequency):
    """生成方波"""
    period = 1.0 / frequency
    phase = (t % period) / period
    return 1.0 if phase < 0.5 else -1.0

def generate_sawtooth_wave(t, frequency):
    """生成锯齿波"""
    period = 1.0 / frequency
    phase = (t % period) / period
    return 2 * phase - 1.0

def generate_noise():
    """生成白噪声"""
    return random.uniform(-1, 1)

def generate_wav(filename, generator_func, duration, sample_rate=44100):
    """生成 WAV 文件"""
    n_samples = int(sample_rate * duration)

    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for i in range(n_samples):
            t = i / sample_rate
            sample = generator_func(t, i, n_samples)

            sample_int = int(sample * 32767)
            wav_file.writeframes(struct.pack('<h', sample_int))

def eat_normal_generator(t, i, n_samples):
    """普通食物音效：快速的上升方波，清脆"""
    base_freq = 400 + (i / n_samples) * 400
    pitch_vibrato = 1.0 + 0.02 * math.sin(2 * math.pi * 20 * t)
    envelope = 1.0 - (i / n_samples) ** 0.5
    return generate_square_wave(t, base_freq * pitch_vibrato) * envelope * 0.3

def eat_special_generator(t, i, n_samples):
    """特殊食物音效：双层音调上升的方波，更亮丽"""
    freq1 = 600 + (i / n_samples) * 600
    freq2 = freq1 * 1.5
    envelope = 1.0 - (i / n_samples) ** 0.5
    return (generate_square_wave(t, freq1) + generate_square_wave(t, freq2) * 0.5) * envelope * 0.25

def game_over_generator(t, i, n_samples):
    """游戏结束音效：低频方波下降，低沉"""
    freq = 150 * math.exp(-3 * t)
    envelope = math.exp(-3 * t)
    return generate_square_wave(t, freq) * envelope * 0.4

def game_start_generator(t, i, n_samples):
    """游戏开始音效：上升锯齿波，昂扬"""
    freq = 300 + (i / n_samples) * 400
    envelope = 1.0 - (i / n_samples) ** 0.7
    return generate_sawtooth_wave(t, freq) * envelope * 0.3

def generate_all():
    """生成所有音效"""
    print("正在生成 8-bit 复古风格音效...")
    print()

    sounds = [
        ('eat_normal.wav', eat_normal_generator, 0.1, '普通食物音效'),
        ('eat_special.wav', eat_special_generator, 0.12, '特殊食物音效'),
        ('game_over.wav', game_over_generator, 0.4, '游戏结束音效'),
        ('game_start.wav', game_start_generator, 0.15, '游戏开始音效'),
    ]

    for filename, generator, duration, desc in sounds:
        print(f"  生成 {desc} ({filename})...")
        generate_wav(filename, generator, duration)
        print(f"  完成！")

    print()
    print("所有音效生成完成！")
    print()
    print("音效特点：")
    print("  - eat_normal: 清脆的上升方波，短促有力")
    print("  - eat_special: 双层音调，更亮丽")
    print("  - game_over: 低频下降，低沉的失败感")
    print("  - game_start: 上升锯齿波，昂扬的开始感")

if __name__ == '__main__':
    generate_all()