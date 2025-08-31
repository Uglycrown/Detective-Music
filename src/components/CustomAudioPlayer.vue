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
import { ref, watch } from 'vue';

const props = defineProps({
  src: String,
  autoPlay: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['ended', 'next', 'previous']);

const audioPlayer = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.5);

watch(() => props.src, (newSrc) => {
  if (newSrc && audioPlayer.value) {
    audioPlayer.value.load();
    if (props.autoPlay) {
      const playPromise = audioPlayer.value.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isPlaying.value = true;
        }).catch(error => {
          console.error("Autoplay was prevented:", error);
          isPlaying.value = false;
        });
      }
    }
  }
});

const onTimeUpdate = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime;
  }
};

const onLoadedMetadata = () => {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration;
  }
};

const onEnded = () => {
  isPlaying.value = false;
  emit('ended');
};

const togglePlay = () => {
  if (!audioPlayer.value) return;

  if (isPlaying.value) {
    audioPlayer.value.pause();
    isPlaying.value = false;
  } else {
    const playPromise = audioPlayer.value.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlaying.value = true;
      }).catch(error => {
        console.error("Play was prevented:", error);
        isPlaying.value = false;
      });
    }
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
    const time = event.target.value;
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
