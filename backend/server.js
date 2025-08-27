const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ytdl = require('@distube/ytdl-core');
const rangeParser = require('range-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const musicDir = path.join(__dirname, 'music');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, musicDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Endpoint to upload a song
app.post('/api/upload', upload.single('song'), (req, res) => {
  res.json({ message: 'Song uploaded successfully!' });
});

// Endpoint to download YouTube video audio
app.post('/api/download-youtube', async (req, res) => {
  const { url } = req.body;
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[<>:"/|?*]/g, ''); // Sanitize filename
    const filePath = path.join(musicDir, `${title}.mp3`);

    const audioStream = ytdl(url, { filter: 'audioonly' });
    const fileStream = fs.createWriteStream(filePath);

    audioStream.pipe(fileStream);

    fileStream.on('finish', () => {
      res.json({ message: 'Download complete!', filename: `${title}.mp3` });
    });

    fileStream.on('error', (err) => {
      console.error('Error writing file:', err);
      res.status(500).json({ error: 'Error saving the file' });
    });

  } catch (error) {
    console.error('Error downloading from YouTube:', error);
    res.status(500).json({ error: 'Error downloading from YouTube' });
  }
});


// Endpoint to get the list of songs
app.get('/api/songs', (req, res) => {
  fs.readdir(musicDir, (err, files) => {
    if (err) {
      console.error('Error reading music directory:', err);
      return res.status(500).json({ error: 'Error reading music directory' });
    }
    const songs = files.filter(file => file.toLowerCase().endsWith('.mp3'));
    res.json(songs);
  });
});

// Endpoint to stream a song with robust range handling
app.get('/api/songs/:songName', (req, res) => {
  const songName = req.params.songName;
  const songPath = path.join(musicDir, songName);

  if (fs.existsSync(songPath)) {
    const stat = fs.statSync(songPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const ranges = rangeParser(fileSize, range, { combine: true });

      if (ranges === -1 || ranges === -2) {
        console.error('Invalid range');
        res.status(416).send('Requested Range Not Satisfiable');
        return;
      }

      const { start, end } = ranges[0];
      const chunksize = (end - start) + 1;

      const file = fs.createReadStream(songPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(songPath).pipe(res);
    }
  } else {
    res.status(404).json({ error: 'Song not found' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
