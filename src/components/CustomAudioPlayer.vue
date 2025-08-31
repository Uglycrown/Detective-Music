<template>
  <div class="player-container">
    <audio ref="audioPlayer" :src="src" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata" @ended="onEnded"></audio>

    <div class="player-controls">
      <div class="control-buttons">
        <button @click="playPrev" class="control-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        <button @click="togglePlay" class="play-btn">
          <svg v-if="!isPlaying" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button @click="playNext" class="control-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zm-4.5 6-8.5 6V6z"/></svg>
        </button>
      </div>

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
    </div>

    <div class="volume-controls">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="volume-icon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
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
</template>

<script setup>
import { ref, watch, defineExpose, onUnmounted, computed } from 'vue';

const props = defineProps({
  src: String,
  songId: String, // Expecting the song filename as an ID
  startTime: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['ended', 'next', 'previous', 'progress']);

const audioPlayer = ref(null);
const isPlaying = ref(false);
const currentTime = ref(props.startTime);
const duration = ref(0);
const volume = ref(0.5);
const lastSaveTime = ref(0);

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

  // Throttle saving progress to every 5 seconds
  if (now - lastSaveTime.value > 5000) {
    saveProgress(currentTime.value, duration.value);
    lastSaveTime.value = now;
  }
};

const onLoadedMetadata = () => {
  if (!audioPlayer.value) return;
  duration.value = audioPlayer.value.duration;
  
  // Restore progress when metadata is loaded
  const allProgress = getProgress();
  const songProgress = allProgress[props.songId];
  const startAt = songProgress ? songProgress.currentTime : props.startTime;
  
  audioPlayer.value.currentTime = startAt;
  currentTime.value = startAt;

  // Save initial duration
  saveProgress(startAt, duration.value);
};

const onEnded = () => {
  isPlaying.value = false;
  saveProgress(0, duration.value); // Reset progress on end
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

const playNext = () => {
  emit('next');
};

const playPrev = () => {
  emit('previous');
};

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
  if (isNaN(timeInSeconds)) return '0:00';
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

defineExpose({
  play,
});
</script>

<style scoped>
.player-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.player-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 500px;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-btn,
.play-btn {
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

.play-btn {
  width: 40px;
  height: 40px;
  background: white;
  color: black;
  border-radius: 50%;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.play-btn:hover {
  transform: scale(1.05);
  background: #f0f0f0;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
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
  margin-top: -5px; /* Center the thumb */
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
  gap: 12px;
  min-width: 150px;
}

.volume-icon {
  color: #b3b3b3;
}
</style>