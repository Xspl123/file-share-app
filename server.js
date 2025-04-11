const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(express.json());

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "_" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
const transferCodes = {}; // Store code → file path

// Upload Route
app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;

  // Check if the file is already uploaded
  if (Object.values(transferCodes).includes(filePath)) {
    return res.status(400).json({ error: "File already uploaded" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  transferCodes[code] = filePath;

  // Auto delete after 10 mins
  setTimeout(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    delete transferCodes[code];
  }, 10 * 60 * 1000);

  res.json({ code });
});

// QR Code Route
app.get("/qrcode/:code", async (req, res) => {
  const code = req.params.code;
  const url = `http://192.168.1.170:${PORT}/download/${code}`;

  try {
    const qr = await QRCode.toDataURL(url);
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

// Download Route
app.get("/download/:code", (req, res) => {
  const code = req.params.code;
  const filePath = transferCodes[code];

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found or expired");
  }

  res.download(filePath, () => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    delete transferCodes[code];
  });
});

app.get('/get-ip', (req, res) => {
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json({ ip: userIp });
});

app.post('/log-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).send('IP address is required');

  const logFilePath = path.join(__dirname, 'user-ips.txt');
  const logEntry = `${new Date().toISOString()} - ${ip}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error("Error logging IP:", err);
      return res.status(500).send('Failed to log IP');
    }
    res.status(200).send('IP logged successfully');
  });
});

app.listen(PORT, "192.168.1.170", () => {
  console.log(`Server running on http://192.168.1.170:${PORT}`);
});
