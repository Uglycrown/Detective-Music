<template>
  <div class="player-wrapper">
    <audio ref="audioPlayer" :src="src" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata" @ended="onEnded"></audio>

    <!-- Row 1: Song Title -->
    <div class="song-info">
      <span class="song-title">{{ songTitle }}</span>
    </div>

    <!-- Row 2: Timelines -->
    <div class="timelines">
      <div class="progress-container">
        <span class="time-display">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar-wrapper">
          <input
            type="range"
            :value="currentTime"
            :max="duration || 100"
            @input="seek"
            class="progress-bar"
            :style="progressStyle"
          />
        </div>
        <span class="time-display">{{ formatTime(duration) }}</span>
      </div>
      <div class="volume-controls">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="volume-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        <div class="progress-bar-wrapper">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            v-model="volume"
            @input="setVolume"
            class="progress-bar"
            :style="volumeStyle"
          />
        </div>
      </div>
    </div>

    <!-- Row 3: Controls -->
    <div class="player-controls">
      <button @click="$emit('shuffle')" class="control-btn shuffle-btn" :class="{active: shuffleActive}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
      </button>
      <div class="main-controls">
        <button @click="playPrev" class="control-btn">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        <button @click="togglePlay" class="play-btn">
          <svg v-if="!isPlaying" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button @click="playNext" class="control-btn">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zm-4.5 6-8.5 6V6z"/></svg>
        </button>
      </div>
      <button class="control-btn">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineExpose, onUnmounted, computed } from 'vue';

const props = defineProps({
  src: String,
  songId: String,
  shuffleActive: {
    type: Boolean,
    default: false,
  }
});

const emit = defineEmits(['ended', 'next', 'previous', 'progress', 'shuffle']);

const audioPlayer = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.5);
const lastSaveTime = ref(0);

const songTitle = computed(() => {
  if (!props.songId) return 'No song selected';
  return props.songId.replace('.mp3', '');
});

// --- Progress Management ---
const getProgress = () => {
  const progress = localStorage.getItem('song_progress');
  return progress ? JSON.parse(progress) : {};
};

const saveProgress = (time, dur) => {
  const allProgress = getProgress();
  if (!props.songId) return;
  allProgress[props.songId] = {
    currentTime: time,
    duration: dur,
  };
  localStorage.setItem('song_progress', JSON.stringify(allProgress));
  emit('progress', { songId: props.songId, currentTime: time, duration: dur });
};

// --- Lifecycle and Event Handlers ---
watch(() => props.src, (newSrc) => {
  if (newSrc && audioPlayer.value) {
    audioPlayer.value.load();
    const allProgress = getProgress();
    const songProgress = allProgress[props.songId];
    if (songProgress) {
      audioPlayer.value.currentTime = songProgress.currentTime;
      currentTime.value = songProgress.currentTime;
    }
  }
});

const onTimeUpdate = () => {
  if (!audioPlayer.value) return;
  const now = Date.now();
  currentTime.value = audioPlayer.value.currentTime;

  if (now - lastSaveTime.value > 5000) {
    saveProgress(currentTime.value, duration.value);
    lastSaveTime.value = now;
  }
};

const onLoadedMetadata = () => {
  if (!audioPlayer.value) return;
  duration.value = audioPlayer.value.duration;
  const allProgress = getProgress();
  const songProgress = allProgress[props.songId];
  const startAt = songProgress ? songProgress.currentTime : 0;
  
  audioPlayer.value.currentTime = startAt;
  currentTime.value = startAt;
  saveProgress(startAt, duration.value);
};

const onEnded = () => {
  isPlaying.value = false;
  saveProgress(0, duration.value);
  emit('ended');
};

onUnmounted(() => {
  if (audioPlayer.value) {
    saveProgress(audioPlayer.value.currentTime, duration.value);
  }
});

// --- Playback Controls ---
const play = () => {
  if (!audioPlayer.value) return;
  const playPromise = audioPlayer.value.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      isPlaying.value = true;
    }).catch(error => {
      console.error("Play was prevented:", error);
      isPlaying.value = false;
    });
  }
};

const togglePlay = () => {
  if (!audioPlayer.value) return;
  if (isPlaying.value) {
    audioPlayer.value.pause();
    isPlaying.value = false;
  } else {
    play();
  }
};

const playNext = () => emit('next');
const playPrev = () => emit('previous');

const seek = (event) => {
  if (audioPlayer.value) {
    const time = parseFloat(event.target.value);
    audioPlayer.value.currentTime = time;
    currentTime.value = time;
  }
};

const setVolume = () => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value;
  }
};

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds === 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const progressStyle = computed(() => {
  const progress = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
  return {
    background: `linear-gradient(to right, #1db954 ${progress}%, rgba(255, 255, 255, 0.3) ${progress}%)`
  };
});

const volumeStyle = computed(() => {
  const progress = volume.value * 100;
  return {
    background: `linear-gradient(to right, #fff ${progress}%, rgba(255, 255, 255, 0.3) ${progress}%)`
  };
});

defineExpose({ play });
</script>

<style scoped>
.player-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
}

.song-info {
  text-align: center;
  margin-bottom: 4px;
}

.song-title {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.timelines {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-controls {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.main-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-btn {
  background: none;
  border: none;
  color: #b3b3b3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}
.control-btn:hover {
  color: white;
}
.control-btn.shuffle-btn.active {
  color: #1db954;
}

.play-btn {
  width: 42px;
  height: 42px;
  background: white;
  color: black;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}
.play-btn:hover {
  transform: scale(1.05);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  flex: 1;
}

.time-display {
  font-size: 12px;
  color: #b3b3b3;
  min-width: 40px;
  text-align: center;
}

.progress-bar-wrapper {
  flex: 1;
  height: 4px;
  display: flex;
  align-items: center;
}

.progress-bar {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, #1db954 0%, rgba(255, 255, 255, 0.3) 0%);
  outline: none;
  transition: background 0.2s ease;
  cursor: pointer;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  margin-top: -5px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.progress-bar:hover::-webkit-slider-thumb {
  opacity: 1;
}

.progress-bar::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.progress-bar:hover::-moz-range-thumb {
  opacity: 1;
}

.volume-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 150px;
  flex-shrink: 0; /* Prevent shrinking */
}

.volume-icon {
  color: #b3b3b3;
}
</style>
