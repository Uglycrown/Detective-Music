<template>
  <div class="custom-audio-player">
    <audio ref="audioPlayer" :src="src" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata" @ended="onEnded"></audio>
    <div class="controls">
      <button @click="playPrev">⏮️</button>
      <button @click="togglePlay">{{ isPlaying ? '⏸️' : '▶️' }}</button>
      <button @click="playNext">⏭️</button>
    </div>
    <div class="progress-bar">
      <span>{{ formatTime(currentTime) }}</span>
      <input type="range" :value="currentTime" :max="duration" @input="seek" />
      <span>{{ formatTime(duration) }}</span>
    </div>
    <div class="volume-control">
      <span>🔊</span>
      <input type="range" min="0" max="1" step="0.1" v-model="volume" @input="setVolume" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineExpose, onUnmounted } from 'vue';

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
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

defineExpose({
  play,
});
</script>

<style scoped>
.custom-audio-player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: #282828;
  color: white;
}

.controls button {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.progress-bar {
  display: flex;
  align-items: center;
}

.progress-bar input {
  width: 200px;
  margin: 0 10px;
}

.volume-control {
  display: flex;
  align-items: center;
}

.volume-control input {
  width: 100px;
}
</style>
