<script setup>
import { ref, onMounted, computed } from 'vue';

const songs = ref([]);
const currentSong = ref(null);
const audioPlayer = ref(null);
const fileInput = ref(null);
const youtubeUrl = ref('');
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.7);
const sidebarOpen = ref(false);
const showUploadModal = ref(false);

const fetchSongs = async () => {
  try {
    const response = await fetch('https://detective-music.onrender.com/api/songs');
    if (response.ok) {
      const data = await response.json();
      songs.value = data;
    } else {
      console.error('Failed to fetch songs');
    }
  } catch (error) {
    console.error('Error fetching songs:', error);
  }
};

onMounted(() => {
  fetchSongs();
  // Initialize audio event listeners
  if (audioPlayer.value) {
    audioPlayer.value.addEventListener('timeupdate', updateTime);
    audioPlayer.value.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.value.addEventListener('play', () => isPlaying.value = true);
    audioPlayer.value.addEventListener('pause', () => isPlaying.value = false);
  }
});

const updateTime = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime;
  }
};

const updateDuration = () => {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration;
  }
};

const playSong = (song) => {
  currentSong.value = song;
  if (audioPlayer.value) {
    audioPlayer.value.src = `https://detective-music.onrender.com/api/songs/${song}`;
    audioPlayer.value.play();
  }
};

const togglePlay = () => {
  if (audioPlayer.value) {
    if (isPlaying.value) {
      audioPlayer.value.pause();
    } else {
      audioPlayer.value.play();
    }
  }
};

const getNextSong = () => {
  if (!currentSong.value) return null;
  const currentIndex = songs.value.indexOf(currentSong.value);
  if (currentIndex < songs.value.length - 1) {
    return songs.value[currentIndex + 1];
  }
  return songs.value[0]; // Loop back to the first song
};

const getPreviousSong = () => {
  if (!currentSong.value) return null;
  const currentIndex = songs.value.indexOf(currentSong.value);
  if (currentIndex > 0) {
    return songs.value[currentIndex - 1];
  }
  return songs.value[songs.value.length - 1]; // Loop back to the last song
};

const playNextSong = () => {
  const nextSong = getNextSong();
  if (nextSong) {
    playSong(nextSong);
  }
};

const playPreviousSong = () => {
  const previousSong = getPreviousSong();
  if (previousSong) {
    playSong(previousSong);
  }
};

const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const progressPercentage = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

const setProgress = (event) => {
  if (audioPlayer.value && duration.value) {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newTime = percent * duration.value;
    audioPlayer.value.currentTime = newTime;
  }
};

const setVolume = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  volume.value = Math.max(0, Math.min(1, percent));
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value;
  }
};

const handleFileUpload = async () => {
  const file = fileInput.value.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('song', file);

  try {
    const response = await fetch('https://detective-music.onrender.com/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      showNotification('Song uploaded successfully!');
      fetchSongs(); // Refresh the song list
      showUploadModal.value = false;
    } else {
      showNotification('Failed to upload song', 'error');
    }
  } catch (error) {
    console.error('Error uploading song:', error);
    showNotification('Error uploading song', 'error');
  }
};

const handleYoutubeDownload = async () => {
  if (!youtubeUrl.value) return;

  try {
    const response = await fetch('https://detective-music.onrender.com/api/download-youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: youtubeUrl.value }),
    });

    if (response.ok) {
      showNotification('YouTube audio downloaded successfully!');
      fetchSongs(); // Refresh the song list
      youtubeUrl.value = ''; // Clear the input
      showUploadModal.value = false;
    } else {
      showNotification('Failed to download YouTube audio', 'error');
    }
  } catch (error) {
    console.error('Error downloading YouTube audio:', error);
    showNotification('Error downloading YouTube audio', 'error');
  }
};

const showNotification = (message, type = 'success') => {
  // Simple notification - you could enhance this with a proper toast system
  alert(message);
};

</script>

<template>
  <div id="app">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <h1 class="logo">
          <span class="logo-icon">🎵</span>
          Detective Music
        </h1>
        <button class="sidebar-close" @click="sidebarOpen = false">×</button>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li><a href="#" class="nav-item active">🏠 Home</a></li>
          <li><a href="#" class="nav-item">🔍 Search</a></li>
          <li><a href="#" class="nav-item">📚 Your Library</a></li>
        </ul>
      </nav>

      <div class="sidebar-actions">
        <button class="create-playlist-btn" @click="showUploadModal = true">
          ➕ Add Music
        </button>
      </div>

      <div class="playlist-section">
        <h3>Your Playlists</h3>
        <div class="playlist-item">🎵 My Playlist #1</div>
        <div class="playlist-item">🎵 Favorites</div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="top-bar">
        <button class="menu-toggle" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="search-container">
          <input type="text" placeholder="Search for artists, songs, or podcasts" class="search-input">
        </div>
        <div class="user-menu">
          <div class="user-avatar">👤</div>
        </div>
      </header>

      <!-- Main Section -->
      <div class="content-area">
        <div class="welcome-section">
          <h2>Good evening</h2>
          <div class="quick-picks">
            <div class="quick-pick-item" v-for="(song, index) in songs.slice(0, 6)" :key="song" @click="playSong(song)">
              <div class="quick-pick-cover">🎵</div>
              <span class="quick-pick-title">{{ song.replace('.mp3', '') }}</span>
            </div>
          </div>
        </div>

        <div class="made-for-you">
          <h2>Made for You</h2>
          <div class="track-grid">
            <div v-for="song in songs" :key="song" class="track-card" :class="{ 'track-active': currentSong === song }"
              @click="playSong(song)">
              <div class="track-cover">
                <div class="play-button" v-if="currentSong !== song || !isPlaying">▶️</div>
                <div class="pause-button" v-else>⏸️</div>
                <div class="track-placeholder">🎵</div>
              </div>
              <div class="track-info">
                <h4 class="track-title">{{ song.replace('.mp3', '') }}</h4>
                <p class="track-artist">Unknown Artist</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Now Playing Bar -->
    <div class="now-playing-bar" v-if="currentSong">
      <div class="now-playing-track">
        <div class="track-cover-small">🎵</div>
        <div class="track-details">
          <div class="track-name">{{ currentSong.replace('.mp3', '') }}</div>
          <div class="artist-name">Unknown Artist</div>
        </div>
      </div>

      <div class="player-controls">
        <div class="control-buttons">
          <button class="control-btn" @click="playPreviousSong">⏮️</button>
          <button class="play-btn" @click="togglePlay">
            {{ isPlaying ? '⏸️' : '▶️' }}
          </button>
          <button class="control-btn" @click="playNextSong">⏭️</button>
        </div>

        <div class="progress-container">
          <span class="time-display">{{ formatTime(currentTime) }}</span>
          <div class="progress-bar" @click="setProgress">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <span class="time-display">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div class="volume-controls">
        <span class="volume-icon">🔊</span>
        <div class="volume-bar" @click="setVolume">
          <div class="volume-fill" :style="{ width: (volume * 100) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <div class="modal-overlay" v-if="showUploadModal" @click="showUploadModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Add Music</h2>
          <button class="modal-close" @click="showUploadModal = false">×</button>
        </div>

        <div class="modal-content">
          <div class="upload-section">
            <h3>Upload MP3 File</h3>
            <div class="file-upload-area">
              <input type="file" ref="fileInput" accept=".mp3" id="file-input" hidden />
              <label for="file-input" class="file-upload-btn">
                📁 Choose MP3 File
              </label>
              <button class="upload-btn" @click="handleFileUpload">Upload</button>
            </div>
          </div>

          <div class="divider">OR</div>

          <div class="youtube-section">
            <h3>Download from YouTube</h3>
            <form @submit.prevent="handleYoutubeDownload" class="youtube-form">
              <input type="url" v-model="youtubeUrl" placeholder="Paste YouTube URL here" class="youtube-input" />
              <button type="submit" class="download-btn">Download</button>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Audio Player -->
    <audio ref="audioPlayer" @ended="playNextSong" @timeupdate="updateTime" @loadedmetadata="updateDuration"
      @play="isPlaying = true" @pause="isPlaying = false" style="display: none;"></audio>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100vh;
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 1fr 90px;
  grid-template-areas:
    "sidebar main"
    "now-playing now-playing";
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  grid-area: sidebar;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
}

.sidebar-close {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
}

.sidebar-nav li {
  margin-bottom: 16px;
}

.nav-item {
  color: #b3b3b3;
  text-decoration: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  padding: 8px 0;
  transition: color 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  color: white;
}

.create-playlist-btn {
  background: #1db954;
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 32px;
}

.create-playlist-btn:hover {
  background: #1ed760;
}

.playlist-section h3 {
  color: #b3b3b3;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.playlist-item {
  color: #b3b3b3;
  padding: 8px 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.playlist-item:hover {
  color: white;
}

/* Main Content */
.main-content {
  grid-area: main;
  background: linear-gradient(135deg, rgba(30, 60, 114, 0.8) 0%, rgba(42, 82, 152, 0.8) 100%);
  backdrop-filter: blur(10px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

.main-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(29, 185, 84, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
}

.content-area {
  position: relative;
  z-index: 2;
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 16px 32px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 16px;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.search-container {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  outline: none;
  transition: background-color 0.2s ease;
}

.search-input::placeholder {
  color: #b3b3b3;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.2);
}

.user-menu {
  margin-left: auto;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-avatar:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Content Area */
.content-area {
  padding: 32px;
  flex: 1;
}

.welcome-section h2 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 24px;
}

.quick-picks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 48px;
}

.quick-pick-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(15px);
  position: relative;
  overflow: hidden;
}

.quick-pick-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.quick-pick-item:hover::before {
  left: 100%;
}

.quick-pick-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  border-color: rgba(29, 185, 84, 0.3);
}

.quick-pick-cover {
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.quick-pick-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.made-for-you h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
}

.track-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.track-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.track-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(29, 185, 84, 0.1), rgba(30, 215, 96, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.track-card:hover::before {
  opacity: 1;
}

.track-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  border-color: rgba(29, 185, 84, 0.3);
}

.track-card.track-active {
  background: rgba(29, 185, 84, 0.2);
  border: 2px solid #1db954;
  box-shadow: 0 8px 32px rgba(29, 185, 84, 0.4);
}

.track-card.track-active::before {
  opacity: 0.5;
}

.track-cover {
  width: 100%;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.track-placeholder {
  font-size: 48px;
  opacity: 0.5;
}

.play-button,
.pause-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(29, 185, 84, 0.9);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.track-card:hover .play-button,
.track-card:hover .pause-button {
  opacity: 1;
}

.track-info {
  text-align: left;
}

.track-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 14px;
  color: #b3b3b3;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Now Playing Bar */
.now-playing-bar {
  grid-area: now-playing;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  padding: 16px 24px;
  gap: 24px;
}

.now-playing-track {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 200px;
}

.track-cover-small {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.track-details {
  min-width: 0;
}

.track-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name {
  font-size: 12px;
  color: #b3b3b3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
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
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.play-btn {
  width: 40px;
  height: 40px;
  background: white;
  color: black;
  border-radius: 50%;
  font-size: 16px;
}

.control-btn:hover {
  color: #1db954;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 500px;
}

.time-display {
  font-size: 12px;
  color: #b3b3b3;
  min-width: 40px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: #1db954;
  border-radius: 2px;
  transition: width 0.1s ease;
}

.volume-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
}

.volume-icon {
  font-size: 16px;
}

.volume-bar {
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}

.volume-fill {
  height: 100%;
  background: #1db954;
  border-radius: 2px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 0;
  min-width: 500px;
  max-width: 90vw;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.modal-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-content {
  padding: 24px;
}

.upload-section,
.youtube-section {
  margin-bottom: 24px;
}

.upload-section h3,
.youtube-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.file-upload-area {
  display: flex;
  gap: 12px;
  align-items: center;
}

.file-upload-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-upload-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.upload-btn,
.download-btn {
  background: #1db954;
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.upload-btn:hover,
.download-btn:hover {
  background: #1ed760;
}

.divider {
  text-align: center;
  color: #b3b3b3;
  margin: 24px 0;
  font-weight: 600;
}

.youtube-form {
  display: flex;
  gap: 12px;
}

.youtube-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.youtube-input::placeholder {
  color: #b3b3b3;
}

.youtube-input:focus {
  border-color: #1db954;
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  #app {
    grid-template-columns: 1fr;
    grid-template-areas:
      "main"
      "now-playing";
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 999;
    transform: translateX(-100%);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
  }

  .sidebar-open {
    transform: translateX(0);
  }

  .sidebar-close {
    display: block;
  }

  .menu-toggle {
    display: block;
  }

  /* Enhanced Main Content Mobile Styles */
  .main-content {
    background: linear-gradient(135deg, rgba(30, 60, 114, 0.9) 0%, rgba(42, 82, 152, 0.9) 100%);
    min-height: 100vh;
  }

  .top-bar {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(15px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .search-container {
    max-width: 200px;
  }

  .search-input {
    padding: 10px 14px;
    font-size: 14px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.15);
  }

  .content-area {
    padding: 20px 16px;
    padding-bottom: 100px;
    /* Extra space for now playing bar */
  }

  .welcome-section {
    margin-bottom: 32px;
  }

  .welcome-section h2 {
    font-size: 28px;
    font-weight: 800;
    margin-bottom: 20px;
    background: linear-gradient(45deg, #fff, #1db954);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .made-for-you h2 {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 20px;
    color: rgba(255, 255, 255, 0.95);
  }

  .track-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
  }

  .track-card {
    padding: 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .track-card:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .quick-picks {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .quick-pick-item {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 12px 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .quick-pick-item:hover {
    background: rgba(255, 255, 255, 0.22);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  .quick-pick-cover {
    width: 45px;
    height: 45px;
    background: linear-gradient(45deg, #1db954, #1ed760);
    border-radius: 8px;
  }

  .now-playing-bar {
    padding: 12px 16px;
    gap: 12px;
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }

  .now-playing-track {
    min-width: 140px;
  }

  .volume-controls {
    display: none;
  }

  .modal {
    min-width: auto;
    margin: 20px;
    border-radius: 16px;
  }
}

@media (max-width: 768px) {

  /* Enhanced Mobile Styles for Tablets and Large Phones */
  .top-bar {
    padding: 14px 16px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(20px);
  }

  .search-container {
    max-width: 180px;
  }

  .search-input {
    padding: 8px 12px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.18);
  }

  .content-area {
    padding: 16px 12px;
    padding-bottom: 110px;
  }

  .welcome-section h2 {
    font-size: 24px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 24px;
  }

  .made-for-you h2 {
    font-size: 20px;
    text-align: center;
    margin-bottom: 20px;
  }

  .track-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 14px;
    justify-items: center;
  }

  .track-card {
    width: 100%;
    max-width: 160px;
    padding: 10px;
  }

  .track-title {
    font-size: 14px;
  }

  .track-artist {
    font-size: 12px;
  }

  .quick-picks {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .quick-pick-item {
    padding: 10px 14px;
    border-radius: 10px;
  }

  .quick-pick-cover {
    width: 40px;
    height: 40px;
  }

  .quick-pick-title {
    font-size: 14px;
  }

  /* Enhanced Player Controls */
  .player-controls {
    gap: 6px;
  }

  .control-buttons {
    gap: 12px;
  }

  .progress-container {
    max-width: 280px;
    gap: 8px;
  }

  .time-display {
    font-size: 11px;
    min-width: 32px;
  }

  .progress-bar {
    height: 5px;
  }

  .now-playing-bar {
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.98);
    backdrop-filter: blur(25px);
  }

  .track-cover-small {
    width: 48px;
    height: 48px;
  }

  .track-name {
    font-size: 13px;
  }

  .artist-name {
    font-size: 11px;
  }

  /* Modal Enhancements */
  .modal {
    margin: 16px;
    border-radius: 20px;
  }

  .modal-header {
    padding: 20px;
  }

  .modal-content {
    padding: 20px;
  }

  .youtube-form {
    flex-direction: column;
    gap: 16px;
  }

  .youtube-input {
    padding: 14px 16px;
  }

  .file-upload-area {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .file-upload-btn {
    text-align: center;
    justify-content: center;
  }
}

@media (max-width: 480px) {

  /* Enhanced Styles for Small Mobile Devices */
  .top-bar {
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(25px);
  }

  .search-input {
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 15px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .content-area {
    padding: 12px 10px;
    padding-bottom: 120px;
  }

  .welcome-section h2 {
    font-size: 22px;
    font-weight: 900;
    text-align: center;
    margin-bottom: 20px;
    background: linear-gradient(45deg, #fff, #1db954, #1ed760);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .made-for-you h2 {
    font-size: 18px;
    text-align: center;
    margin-bottom: 16px;
  }

  .track-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 12px;
  }

  .track-card {
    padding: 8px;
    border-radius: 10px;
    max-width: 130px;
    margin: 0 auto;
  }

  .track-title {
    font-size: 12px;
    font-weight: 600;
  }

  .track-artist {
    font-size: 10px;
  }

  .track-cover {
    margin-bottom: 12px;
  }

  .track-placeholder {
    font-size: 32px;
  }

  .play-button,
  .pause-button {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .quick-picks {
    gap: 8px;
  }

  .quick-pick-item {
    padding: 8px 12px;
    border-radius: 8px;
  }

  .quick-pick-cover {
    width: 35px;
    height: 35px;
    font-size: 16px;
  }

  .quick-pick-title {
    font-size: 13px;
    font-weight: 600;
  }

  /* Compact Now Playing Bar */
  .now-playing-bar {
    padding: 8px 12px;
    gap: 8px;
    background: rgba(0, 0, 0, 0.98);
    backdrop-filter: blur(30px);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  .now-playing-track {
    min-width: 100px;
  }

  .track-cover-small {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .track-details {
    display: block;
    min-width: 60px;
  }

  .track-name {
    font-size: 11px;
    font-weight: 600;
  }

  .artist-name {
    font-size: 9px;
  }

  .player-controls {
    gap: 4px;
  }

  .player-controls .progress-container {
    max-width: 160px;
    gap: 6px;
  }

  .progress-bar {
    height: 6px;
    border-radius: 3px;
  }

  .control-buttons {
    gap: 6px;
    margin-bottom: 4px;
  }

  .control-btn,
  .play-btn {
    font-size: 14px;
  }

  .control-btn {
    padding: 4px;
  }

  .play-btn {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }

  .time-display {
    font-size: 9px;
    min-width: 28px;
  }

  /* Compact Modal */
  .modal {
    margin: 12px;
    border-radius: 16px;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-header h2 {
    font-size: 20px;
  }

  .modal-content {
    padding: 16px;
  }

  .upload-section h3,
  .youtube-section h3 {
    font-size: 16px;
  }

  .youtube-input {
    padding: 12px 14px;
    font-size: 14px;
  }

  .upload-btn,
  .download-btn {
    padding: 10px 20px;
    font-size: 14px;
  }
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>