const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

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
  const url = `http://localhost:${PORT}/download/${code}`;

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

app.listen(PORT, "192.168.1.170", () => {
  console.log(`Server running on http://192.168.1.170:${PORT}`);
});
