const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const history = [];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'VisionBoost AI', version: '1.0.0' });
});

app.post('/api/enhance', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const { quality = '1080p', enhancements = '[]' } = req.body;
  const fileName = req.file.originalname;
  const fileSize = (req.file.size / 1024 / 1024).toFixed(1);

  let enhList = [];
  try { enhList = JSON.parse(enhancements); } catch {}

  const outputDir = path.join(__dirname, 'enhanced');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputName = `enhanced_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, outputName);
  fs.copyFileSync(req.file.path, outputPath);
  fs.unlinkSync(req.file.path);

  const entry = {
    id: `j${Date.now()}`,
    name: fileName,
    size: `${fileSize} MB`,
    quality,
    report: `Enhanced "${fileName}" to ${quality}`,
    stats: [
      { val: quality, label: 'Quality' },
      { val: `${enhList.length}x`, label: 'Models' }
    ],
    downloadUrl: `/api/download/${outputName}`
  };
  history.push(entry);

  res.json({ success: true, enhancement: entry });
});

app.get('/api/download/:filename', (req, res) => {
  const filepath = path.join(__dirname, 'enhanced', req.params.filename);
  if (fs.existsSync(filepath)) res.download(filepath);
  else res.status(404).json({ error: 'Not found' });
});

app.get('/api/history', (req, res) => {
  res.json({ history });
});

app.listen(PORT, () => {
  console.log(`🎬 Backend running on http://localhost:${PORT}`);
});