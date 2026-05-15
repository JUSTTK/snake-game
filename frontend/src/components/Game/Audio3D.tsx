import React, { useEffect, useState } from 'react';

interface Audio3DProps {
  enabled?: boolean;
}

interface SpatialAudioProps {
  position: [number, number, number];
  type: 'move' | 'turn' | 'eat' | 'special' | 'death';
  enabled?: boolean;
}

export const Audio3D: React.FC<Audio3DProps> = ({ enabled = true }) => {
  useEffect(() => {
    if (!enabled) return;
  }, [enabled]);

  return null;
};

export const SpatialAudio: React.FC<SpatialAudioProps> = ({
  position,
  type,
  enabled = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const playSpatialSound = async () => {
      try {
        const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        const audioContext = new AudioContext();

        const audioBuffer = generateAudioBuffer(type, audioContext);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const panner = audioContext.createPanner();
        panner.setPosition(position[0], position[1], position[2]);
        panner.refDistance = 5;
        panner.rolloffFactor = 2;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.3;

        source.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(audioContext.destination);

        source.start();
        setIsPlaying(true);

        source.onended = () => {
          setIsPlaying(false);
          audioContext.close();
        };
      } catch (error) {
        console.warn('Failed to play spatial sound:', error);
      }
    };

    if (!isPlaying) {
      playSpatialSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, type, enabled]);

  return null;
};

const generateAudioBuffer = (type: string, audioContext: AudioContext): AudioBuffer => {
  const sampleRate = audioContext.sampleRate;
  const duration = getDuration(type);
  const frameCount = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);

  switch (type) {
    case 'move':
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 3) * 0.1;
      }
      break;

    case 'turn':
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 2) * 0.15;
      }
      break;

    case 'eat':
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        data[i] = (Math.sin(2 * Math.PI * 600 * t) + Math.sin(2 * Math.PI * 800 * t)) *
          Math.exp(-t * 4) * 0.2;
      }
      break;

    case 'special':
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 1.5) * 0.25;
      }
      break;

    case 'death':
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 1) * 0.3;
      }
      break;

    default:
      for (let i = 0; i < frameCount; i++) {
        data[i] = 0;
      }
  }

  return buffer;
};

const getDuration = (type: string): number => {
  switch (type) {
    case 'move': return 0.1;
    case 'turn': return 0.2;
    case 'eat': return 0.3;
    case 'special': return 0.4;
    case 'death': return 0.8;
    default: return 0.1;
  }
};

export const AmbientAudio3D: React.FC<{ enabled?: boolean }> = ({
  enabled = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const playAmbientSound = async () => {
      try {
        const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        const audioContext = new AudioContext();

        const duration = 10;
        const sampleRate = audioContext.sampleRate;
        const frameCount = Math.floor(sampleRate * duration);
        const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          data[i] = Math.sin(2 * Math.PI * 80 * t) * 0.05 +
            Math.sin(2 * Math.PI * 200 * t) * 0.03 * Math.sin(2 * Math.PI * 0.5 * t) +
            Math.sin(2 * Math.PI * 800 * t) * 0.01 * Math.sin(2 * Math.PI * 2 * t);
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.15;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start();
        setIsPlaying(true);

        source.onended = () => {
          setIsPlaying(false);
        };
      } catch (error) {
        console.warn('Failed to play ambient sound:', error);
      }
    };

    if (!isPlaying) {
      playAmbientSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return null;
};
