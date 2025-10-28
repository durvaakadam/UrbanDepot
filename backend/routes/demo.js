const express = require("express");
const { spawn } = require("child_process");
const os = require("os");

const router = express.Router();

router.get("/run-demo", (req, res) => {
  // Try different Python commands based on the platform
  const pythonCommand = os.platform() === "win32" ? "python" : "python3";
  
  console.log(`Attempting to run Python demo with command: ${pythonCommand}`);
  
  const py = spawn(pythonCommand, ["-u", "./scripts/demo.py"]);

  let logs = "";
  let entryTime = null;
  let exitTime = null;

  py.stdout.on("data", (data) => {
    const line = data.toString();
    console.log(`stdout: ${line}`);
    logs += line;

    // 🔎 detect entry/exit times from actual script output
    if (line.includes("Detected Entry Time:")) {
      const match = line.match(/Detected Entry Time: (.+)/);
      if (match) {
        entryTime = match[1].trim();
      }
    }
    if (line.includes("Detected Exit Time:")) {
      const match = line.match(/Detected Exit Time: (.+)/);
      if (match) {
        exitTime = match[1].trim();
      }
    }
  });

  py.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
    logs += data.toString();
  });

  py.on("error", (error) => {
    console.error(`Failed to start Python process: ${error.message}`);
    
    // Return a mock response when Python is not available
    const now = new Date();
    const mockEntryTime = new Date(now.getTime() - 30000); // 30 seconds ago
    const mockExitTime = now;
    
    res.json({
      error: "Python demo not available in this environment",
      logs: `Demo simulation: Python environment not available.\nMock car entry at: ${mockEntryTime.toISOString()}\nMock car exit at: ${mockExitTime.toISOString()}`,
      entryTime: mockEntryTime.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' '),
      exitTime: mockExitTime.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace('T', ' '),
      isMockData: true
    });
  });

  py.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    res.json({
      logs,
      entryTime,
      exitTime,
      isMockData: false
    });
  });
});

module.exports = router;
