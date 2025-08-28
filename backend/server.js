const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ytdl = require('ytdl-core'); // CHANGED: Replaced play-dl with ytdl-core
const rangeParser = require('range-parser');

// NEW: ytdl-core options object for handling authentication
const ytdlOptions = {};
if (process.env.YOUTUBE_COOKIE) {
  ytdlOptions.requestOptions = {
    headers: {
      cookie: process.env.YOUTUBE_COOKIE,
      // User-agent might be needed for some requests to succeed
      'user-agent': process.env.YOUTUBE_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36',
    },
  };
}

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const musicDir = path.join(__dirname, 'music');

// Ensure music directory exists
if (!fs.existsSync(musicDir)){
    fs.mkdirSync(musicDir);
}

// Multer storage configuration (no changes here)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, musicDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Endpoint to upload a song (no changes here)
app.post('/api/upload', upload.single('song'), (req, res) => {
  res.json({ message: 'Song uploaded successfully!' });
});

// Endpoint to download YouTube video audio - REWRITTEN LOGIC
app.post('/api/download-youtube', async (req, res) => {
  const { url } = req.body;
  // CHANGED: Use ytdl.validateURL for validation
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    // CHANGED: Use ytdl.getInfo to fetch video details
    const info = await ytdl.getInfo(url, ytdlOptions);
    // CHANGED: Title is located in a different property
    const title = info.videoDetails.title.replace(/[<>:"/\\|?*]/g, ''); // Sanitize filename
    const filePath = path.join(musicDir, `${title}.mp3`);

    // CHANGED: The main ytdl function returns a stream directly
    const stream = ytdl(url, {
      ...ytdlOptions,
      filter: 'audioonly',
      quality: 'highestaudio',
    });

    const fileStream = fs.createWriteStream(filePath);

    // CHANGED: Attach error handler directly to the stream from ytdl
    stream.on('error', (err) => {
      console.error('Error in ytdl readable stream:', err);
      res.status(500).json({ error: 'Error with the download stream' });
      fileStream.close();
    });

    // CHANGED: Pipe the stream directly
    stream.pipe(fileStream);

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


// Endpoint to get the list of songs (no changes here)
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

// Endpoint to stream a song with robust range handling (no changes here)
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