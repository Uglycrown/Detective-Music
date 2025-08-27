<script setup>
import { ref, onMounted } from 'vue';

const songs = ref([]);
const currentSong = ref(null);
const audioPlayer = ref(null);
const fileInput = ref(null);
const youtubeUrl = ref('');

const fetchSongs = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/songs');
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

onMounted(fetchSongs);

const playSong = (song) => {
  currentSong.value = song;
  if (audioPlayer.value) {
    audioPlayer.value.src = `http://localhost:3000/api/songs/${song}`;
    audioPlayer.value.play();
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

const playNextSong = () => {
  const nextSong = getNextSong();
  if (nextSong) {
    playSong(nextSong);
  }
};

const handleFileUpload = async () => {
  const file = fileInput.value.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('song', file);

  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      alert('Song uploaded successfully!');
      fetchSongs(); // Refresh the song list
    } else {
      alert('Failed to upload song');
    }
  } catch (error) {
    console.error('Error uploading song:', error);
    alert('Error uploading song');
  }
};

const handleYoutubeDownload = async () => {
  if (!youtubeUrl.value) return;

  try {
    const response = await fetch('http://localhost:3000/api/download-youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: youtubeUrl.value }),
    });

    if (response.ok) {
      alert('YouTube audio downloaded successfully!');
      fetchSongs(); // Refresh the song list
      youtubeUrl.value = ''; // Clear the input
    } else {
      alert('Failed to download YouTube audio');
    }
  } catch (error) {
    console.error('Error downloading YouTube audio:', error);
    alert('Error downloading YouTube audio');
  }
};

</script>

<template>
  <div id="app">
    <header>
      <h1>My Music Player</h1>
    </header>
    <main>
      <div class="player">
        <h2>Now Playing</h2>
        <p>{{ currentSong || 'No song selected' }}</p>
        <audio ref="audioPlayer" controls @ended="playNextSong">
          Your browser does not support the audio element.
        </audio>
      </div>
      <div class="controls">
        <div class="add-music-section">
          <h2>Add Music</h2>
          <div class="upload-section">
            <h3>Upload MP3</h3>
            <form @submit.prevent="handleFileUpload">
              <input type="file" ref="fileInput" accept=".mp3" />
              <button type="submit">Upload</button>
            </form>
          </div>
          <div class="youtube-section">
            <h3>From YouTube</h3>
            <form @submit.prevent="handleYoutubeDownload">
              <input type="text" v-model="youtubeUrl" placeholder="Enter YouTube URL" />
              <button type="submit">Download</button>
            </form>
          </div>
        </div>
        <div class="playlist">
          <h2>Playlist</h2>
          <ul>
            <li v-for="song in songs" :key="song" @click="playSong(song)">
              {{ song }}
            </li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.player {
  width: 100%;
  border: 1px solid #ccc;
  padding: 20px;
  border-radius: 8px;
}

.controls {
  display: flex;
  gap: 20px;
}

.add-music-section {
  flex: 1;
  border: 1px solid #ccc;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.playlist {
  flex: 1;
  border: 1px solid #ccc;
  padding: 20px;
  border-radius: 8px;
}

h1, h2, h3 {
  color: #42b983;
}

ul {
  list-style-type: none;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}

li {
  cursor: pointer;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

li:hover {
  background-color: #f0f0f0;
}

audio {
  width: 100%;
  margin-top: 20px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
</style>