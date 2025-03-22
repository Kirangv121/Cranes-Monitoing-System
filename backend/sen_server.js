const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store latest sensor data in memory
let sensorData = {
  temperature: 0,
  weight: 0,
  distance: 0,
  voltage: 0,
  soundLevel: 0,
  vibration: 0,
  totalOperatingHours: 0,
  lastUpdated: new Date().toISOString(),
};

let lastActiveTime = null;

// Alert thresholds
const ALERT_THRESHOLDS = {
  temperature: 40,
  weight: 8,
  distance: 10,
  voltage: 15, // ✅ Updated from 5V to 15V
  soundLevel: 50,
  vibration: 700,
};

// Function to check alerts
function checkAlerts() {
  let alerts = [];
  if (sensorData.temperature > ALERT_THRESHOLDS.temperature) {
    alerts.push({
      alert: "⚠ High Temperature Alert!",
      suggestion: "Check ventilation and cooling systems.",
    });
  }
  if (sensorData.soundLevel > ALERT_THRESHOLDS.soundLevel) {
    alerts.push({
      alert: "🔊 High Sound Level Alert!",
      suggestion: "Lubricate moving parts and inspect for loose components.",
    });
  }
  if (sensorData.weight > ALERT_THRESHOLDS.weight) {
    alerts.push({
      alert: "⚖ Overload Alert!",
      suggestion: "Reduce load to prevent structural damage.",
    });
  }
  if (sensorData.distance < ALERT_THRESHOLDS.distance) {
    alerts.push({
      alert: "📏 Object Too Close!",
      suggestion: "Ensure safe distance to avoid collisions.",
    });
  }
  if (sensorData.voltage > ALERT_THRESHOLDS.voltage) {
    alerts.push({
      alert: "🔌 High Voltage Alert!",
      suggestion: "Inspect power supply and voltage regulators.",
    });
  }
  if (sensorData.vibration > ALERT_THRESHOLDS.vibration) {
    alerts.push({
      alert: "📳 Abnormal Vibration Alert!",
      suggestion: "Check motor mounts and balance rotating parts.",
    });
  }
  return alerts;
}

// API to receive sensor data from Bharat Pi
app.post("/sensor-data", (req, res) => {
  const { temperature, weight, distance, voltage, soundLevel, vibration } =
    req.body;

  // Update sensor data
  if (temperature !== undefined) sensorData.temperature = temperature;
  if (weight !== undefined) sensorData.weight = weight;
  if (distance !== undefined) sensorData.distance = distance;
  if (voltage !== undefined) sensorData.voltage = voltage;
  if (soundLevel !== undefined) sensorData.soundLevel = soundLevel;
  if (vibration !== undefined) sensorData.vibration = vibration;

  sensorData.lastUpdated = new Date().toISOString();

  // **Fix: Always update operating hours when machine is on**
  if (voltage >= 2.5) {
    if (lastActiveTime === null) {
      lastActiveTime = Date.now();
    } else {
      let elapsedTime = (Date.now() - lastActiveTime) / (1000 * 60 * 60); // Convert ms to hours
      sensorData.totalOperatingHours += elapsedTime;
      lastActiveTime = Date.now();
    }
  } else {
    lastActiveTime = null;
  }

  const alerts = checkAlerts();

  // Prevent terminal clearing in production
  if (process.env.NODE_ENV !== "production") {
    console.clear();
  }

  console.log("\n===== 📡 SENSOR DATA RECEIVED =====");
  console.log(`📅 Timestamp: ${sensorData.lastUpdated}`);
  console.log(`🌡 Temperature: ${sensorData.temperature}°C`);
  console.log(`⚖ Load Weight: ${sensorData.weight} kg`);
  console.log(`📏 Distance: ${sensorData.distance} cm`);
  console.log(`🔌 Voltage: ${sensorData.voltage} V`);
  console.log(`🔊 Sound Level: ${sensorData.soundLevel} dB`);
  console.log(`📳 Vibration: ${sensorData.vibration}`);
  console.log(
    `⏳ Total Operating Hours: ${sensorData.totalOperatingHours.toFixed(2)} hrs`
  );
  console.log("===================================");

  if (alerts.length > 0) {
    console.log("🚨 ALERTS:");
    alerts.forEach((alert) => {
      console.log(`${alert.alert}`);
      console.log(`💡 Troubleshooting: ${alert.suggestion}\n`);
    });
  } else {
    console.log("✅ All sensors are within normal range.\n");
  }

  res.status(200).json({
    message: "Sensor data received successfully!",
    sensorData, // ✅ Fixed response key
    alerts,
  });
});

// API to get the latest sensor data
app.get("/get-sensor", (req, res) => {
  res.json({
    message: "Latest sensor data fetched successfully!",
    sensorData, // ✅ Changed from "data" to "sensorData"
    alerts: checkAlerts(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send(
    "🚀 Crane Monitoring API is running! Use /get-sensor to fetch data."
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log("📡 Waiting for sensor data...");
});
