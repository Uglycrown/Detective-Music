<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import CustomAudioPlayer from './components/CustomAudioPlayer.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://detective-music-production.up.railway.app';

const songs = ref([]);
const originalSongs = ref([]);
const currentSong = ref(null);
const fileInput = ref(null);
const youtubeUrl = ref('');
const sidebarOpen = ref(false);
const showUploadModal = ref(false);
const player = ref(null);
const songProgress = ref({});
const showDeleteModal = ref(false);
const songToDelete = ref(null);
const isShuffled = ref(false);

const fetchSongs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/songs`);
    if (response.ok) {
      const data = await response.json();
      songs.value = data;
      originalSongs.value = [...data]; // Keep a copy of the original order
    } else {
      console.error('Failed to fetch songs');
    }
  } catch (error) {
    console.error('Error fetching songs:', error);
  }
};

onMounted(() => {
  fetchSongs();
  const savedProgress = localStorage.getItem('song_progress');
  if (savedProgress) {
    songProgress.value = JSON.parse(savedProgress);
  }
});

const playSong = (song) => {
  currentSong.value = song;
  nextTick(() => {
    player.value?.play();
  });
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

const toggleShuffle = () => {
  isShuffled.value = !isShuffled.value;
  if (isShuffled.value) {
    // Shuffle the current list, keeping the current song at the top
    const remainingSongs = songs.value.filter(s => s !== currentSong.value);
    remainingSongs.sort(() => Math.random() - 0.5);
    songs.value = [currentSong.value, ...remainingSongs];
  } else {
    // Restore the original order, but keep the current song at the top
    const restored = [...originalSongs.value];
    const currentIdx = restored.indexOf(currentSong.value);
    if (currentIdx > -1) {
      restored.splice(currentIdx, 1);
    }
    songs.value = [currentSong.value, ...restored.filter(s => s !== currentSong.value)];
  }
};

const handleFileUpload = async () => {
  const file = fileInput.value.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('song', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
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
    const response = await fetch(`${API_BASE_URL}/api/download-youtube`, {
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

const updateSongProgress = (data) => {
  songProgress.value[data.songId] = {
    currentTime: data.currentTime,
    duration: data.duration,
  };
  localStorage.setItem('song_progress', JSON.stringify(songProgress.value));
};

const getSongProgress = (song) => {
  const progress = songProgress.value[song];
  if (!progress || !progress.duration) return 0;
  return (progress.currentTime / progress.duration) * 100;
};

const deleteSong = (song) => {
  songToDelete.value = song;
  showDeleteModal.value = true;
};

const handleDeleteConfirm = async () => {
  if (!songToDelete.value) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/songs?filename=${encodeURIComponent(songToDelete.value)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // No more alert/notification
      fetchSongs(); // Refresh the song list

      const progress = songProgress.value;
      delete progress[songToDelete.value];
      songProgress.value = { ...progress };
      localStorage.setItem('song_progress', JSON.stringify(progress));

      if (currentSong.value === songToDelete.value) {
        currentSong.value = null;
      }
    } else {
      const data = await response.json();
      showNotification(`Failed to delete song: ${data.error}`, 'error'); // Keep error notifications
    }
  } catch (error) {
    console.error('Error deleting song:', error);
    showNotification('Error deleting song', 'error');
  } finally {
    // Hide the modal and reset the song to delete
    showDeleteModal.value = false;
    songToDelete.value = null;
  }
};

const handleDeleteCancel = () => {
  showDeleteModal.value = false;
  songToDelete.value = null;
};

const truncate = (text, length) => {
  if (text.length > length) {
    return text.substring(0, length) + '...';
  }
  return text;
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
          <h2>Welcome back Detective (Gen-Z)</h2>
          <div class="quick-picks">
            <div class="quick-pick-item" v-for="(song, index) in songs.slice(0, 6)" :key="song" @click="playSong(song)"
              :class="{ 'quick-pick-active': currentSong === song }">
              <div class="quick-pick-cover">
                <div class="cover-play-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                🎵
              </div>
              <div class="quick-pick-details">
                <span class="quick-pick-title">{{ truncate(song.replace('.mp3', ''), 30) }}</span>
                <div class="song-progress-bar-container">
                  <div class="song-progress-bar" :style="{ width: getSongProgress(song) + '%' }"></div>
                </div>
              </div>
              <button class="delete-song-btn" @click.stop="deleteSong(song)">🗑️</button>
            </div>
          </div>
        </div>


      </div>
    </main>

    <!-- Now Playing Bar -->
    <div class="now-playing-bar" v-if="currentSong">
      <CustomAudioPlayer ref="player" :src="`${API_BASE_URL}/api/songs/${currentSong}`" :songId="currentSong"
        :shuffleActive="isShuffled" @ended="playNextSong" @next="playNextSong" @previous="playPreviousSong"
        @progress="updateSongProgress" @shuffle="toggleShuffle" />
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
                📁 Choose MP3 File 1
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

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal :isOpen="showDeleteModal" title="Delete Song"
      :message="`Are you sure you want to delete '${songToDelete}'?`" @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel" />
  </div>
</template>

<style scoped>
@keyframes animated-gradient {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

* {
  box-sizing: border-box;
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100vh;
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 1fr auto;
  grid-template-areas:
    "sidebar main"
    "now-playing now-playing";
  background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%);
  background-size: 200% 200%;
  animation: animated-gradient 20s ease infinite;
  color: #e0e0e0;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  grid-area: sidebar;
  background: rgba(10, 10, 10, 0.5);
  backdrop-filter: blur(20px) saturate(180%);
  padding: 24px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.3s ease;
  box-shadow: 3px 0px 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
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
  color: #fff;
}

.logo-icon {
  font-size: 24px;
  color: #1db954;
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
  font-weight: 600;
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.nav-item:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: white;
  background: rgba(29, 185, 84, 0.2);
}

.create-playlist-btn {
  background: #1db954;
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
  margin-bottom: 32px;
}

.create-playlist-btn:hover {
  background: #1ed760;
  transform: scale(1.03);
}

.playlist-section h3 {
  color: #b3b3b3;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 10px;
}

.playlist-item {
  color: #b3b3b3;
  padding: 10px;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
  border-radius: 8px;
  font-weight: 500;
}

.playlist-item:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

/* Main Content */
.main-content {
  grid-area: main;
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
  background: radial-gradient(circle at 10% 10%, rgba(29, 185, 84, 0.1) 0%, transparent 30%),
    radial-gradient(circle at 90% 80%, rgba(42, 82, 152, 0.1) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.content-area {
  position: relative;
  z-index: 2;
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 16px 32px;
  background: rgba(10, 10, 10, 0.3);
  backdrop-filter: blur(15px) saturate(150%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 5;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid transparent;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 14px;
  outline: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(29, 185, 84, 0.5);
}

/* Content Area */
.content-area {
  padding: 32px;
  flex: 1;
}

.welcome-section h2 {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 24px;
  color: #fff;
}

.quick-picks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 48px;
}

.quick-pick-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  justify-content: space-between;
}

.quick-pick-item:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.15);
}

.quick-pick-active {
  background: rgba(29, 185, 84, 0.2);
  border-color: rgba(29, 185, 84, 0.8);
}

.quick-pick-active .quick-pick-title {
  color: #1db954;
}

.quick-pick-cover {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  position: relative;
  flex-shrink: 0;
}

.cover-play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  width: 44px;
  height: 44px;
  background: #1db954;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.quick-pick-item:hover .cover-play-button {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.quick-pick-details {
  flex: 1;
  min-width: 0;
  padding-right: 10px; /* Add some space for the delete button */
  display: flex;
  align-items: center;
}

.quick-pick-title {
  font-weight: 600;
  font-size: 16px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 234.2px;
}

.delete-song-btn {
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 1;
  transition: background-color 0.2s ease;
}

.delete-song-btn:hover {
  background: #e53935;
}

.song-progress-bar-container {
  height: 4px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.song-progress-bar {
  height: 100%;
  background-color: #1db954;
  border-radius: 2px;
  transition: width 0.2s ease;
}

/* Now Playing Bar */
.now-playing-bar {
  grid-area: now-playing;
  background: #181818;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  padding: 8px 24px;
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.3);
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
  background: #282828;
  border-radius: 12px;
  padding: 0;
  min-width: 500px;
  max-width: 90vw;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
    padding-top: 80px;
    /* Add space for the sticky top bar */
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
    z-index: 1001;
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
    justify-content: space-between;
  }

  .search-container {
    max-width: 180px;
    width: 100%;
  }

  .search-input {
    padding: 8px 12px;
    font-size: 13px;
    background: rgba(255, 255, 255, 0.18);
  }

  .content-area {
    padding: 16px 12px;
    padding-bottom: 110px;
    padding-top: 80px;
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
    padding: 10px 1px;
    background: rgba(0, 0, 0, 0.98);
    backdrop-filter: blur(25px);
    z-index: 1001;
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
    padding: 8px 1px;
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