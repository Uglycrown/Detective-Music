const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
// CHANGED: Replaced ytdl-core with the youtube-dl-exec wrapper
const youtubedl = require('youtube-dl-exec');
const rangeParser = require('range-parser');


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

// Endpoint to download YouTube video audio - REWRITTEN FOR YT-DLP
app.post('/api/download-youtube', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // NEW LOGIC: First, get the video's metadata as JSON
    // The wrapper executes `yt-dlp --dump-single-json <url>`
    const metadata = await youtubedl(url, {
      dumpSingleJson: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      referer: 'https://www.youtube.com/',
      addHeader: ['Accept-Language:en-US,en;q=0.9'],
      forceIpv4: true,
      noCheckCertificates: true,
    });

    const title = metadata.title.replace(/[<>:"/\\|?*]/g, ''); // Sanitize filename
    const filePath = path.join(musicDir, `${title}.mp3`);

    // NEW LOGIC: Now, execute a separate process for the download stream
    // This creates a child process that runs `yt-dlp -f bestaudio -o - <url>`
    const streamProcess = youtubedl.exec(url, {
      format: 'bestaudio', // Get the best audio-only format
      output: '-',         // Output to stdout
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      referer: 'https://www.youtube.com/',
      addHeader: ['Accept-Language:en-US,en;q=0.9'],
      forceIpv4: true,
      noCheckCertificates: true,
      // Optional: Add cookie file if needed for private/restricted videos
      // cookie: 'path/to/cookies.txt'
    });

    console.log(`Starting download for: ${title}`);
    const fileStream = fs.createWriteStream(filePath);

    // Pipe the standard output of the yt-dlp process to the file
    streamProcess.stdout.pipe(fileStream);

    // Handle process events
    streamProcess.on('close', () => {
      console.log(`Download finished for: ${title}.mp3`);
      res.json({ message: 'Download complete!', filename: `${title}.mp3` });
    });

    streamProcess.on('error', (err) => {
      console.error('Error in yt-dlp process:', err);
      res.status(500).json({ error: 'Error during download process' });
      fileStream.close(); // Ensure file stream is closed on error
    });

    // For debugging, you can log stderr
    streamProcess.stderr.on('data', data => {
      console.error(`yt-dlp stderr: ${data}`);
    });


  } catch (error) {
    console.error('Error fetching metadata from YouTube:', error);
    // The error from youtubedl often contains useful info in stderr
    res.status(500).json({ error: 'Error fetching video metadata. The URL might be invalid or private.' });
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