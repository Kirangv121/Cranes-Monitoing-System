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
};

// Function to check alerts and troubleshooting directions
function checkAlerts() {
  let alerts = [];

  if (sensorData.temperature > 40) {
    alerts.push({
      alert: "⚠ High Temperature Alert!",
      suggestion:
        "Check for overheating. Ensure proper ventilation and cooling systems are working.",
    });
  }
  if (sensorData.soundLevel > 50) {
    alerts.push({
      alert: "🔊 High Sound Level Alert!",
      suggestion:
        "Check machinery for unusual noise. Lubricate moving parts and inspect for loose components.",
    });
  }
  if (sensorData.weight > 8) {
    alerts.push({
      alert: "⚖ Overload Alert!",
      suggestion:
        "Reduce the load to prevent structural damage. Ensure load capacity is not exceeded.",
    });
  }
  if (sensorData.distance < 10) {
    alerts.push({
      alert: "📏 Object Too Close!",
      suggestion:
        "Maintain a safe distance to avoid collisions. Check sensor alignment.",
    });
  }
  if (sensorData.voltage > 5) {
    alerts.push({
      alert: "🔌 High Voltage Alert!",
      suggestion:
        "Check for power surges. Inspect power supply and voltage regulators.",
    });
  }
  if (sensorData.vibration > 700) {
    // Assume >700 is abnormal vibration
    alerts.push({
      alert: "📳 Abnormal Vibration Alert!",
      suggestion:
        "Inspect motor mounts, check for loose components, and balance rotating parts.",
    });
  }

  return alerts;
}

// API to receive sensor data from Bharat Pi
app.post("/sensor-data", (req, res) => {
  const { temperature, weight, distance, voltage, soundLevel, vibration } =
    req.body;

  // Update the in-memory sensor data
  if (temperature !== undefined) sensorData.temperature = temperature;
  if (weight !== undefined) sensorData.weight = weight;
  if (distance !== undefined) sensorData.distance = distance;
  if (voltage !== undefined) sensorData.voltage = voltage;
  if (soundLevel !== undefined) sensorData.soundLevel = soundLevel;
  if (vibration !== undefined) sensorData.vibration = vibration;

  // Check for alerts
  const alerts = checkAlerts();

  // Display sensor data and alerts in terminal
  console.clear();
  console.log("\n===== SENSOR DATA RECEIVED =====");
  console.log(`🌡 Temperature: ${sensorData.temperature}°C`);
  console.log(`⚖ Load Weight: ${sensorData.weight} kg`);
  console.log(`📏 Distance: ${sensorData.distance} cm`);
  console.log(`🔌 Voltage: ${sensorData.voltage} V`);
  console.log(`🔊 Sound Level: ${sensorData.soundLevel} dB`);
  console.log(`📳 Vibration: ${sensorData.vibration}`);
  console.log("================================");

  if (alerts.length > 0) {
    console.log("🚨 ALERTS:");
    alerts.forEach((alert) => {
      console.log(`${alert.alert}`);
      console.log(`💡 Troubleshooting: ${alert.suggestion}\n`);
    });
  } else {
    console.log("✅ All sensors are within normal range.\n");
  }

  res
    .status(200)
    .json({ message: "Sensor data received successfully!", alerts });
});

// API to get the latest sensor data
app.get("/get-sensor", (req, res) => {
  res.json({ sensorData, alerts: checkAlerts() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log("Waiting for sensor data...");
});
