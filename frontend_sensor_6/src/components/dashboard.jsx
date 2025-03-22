import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "bootstrap/dist/css/bootstrap.min.css";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = "http://localhost:5000/get-sensor";

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [operatingHours, setOperatingHours] = useState(0);

  // Fetch sensor data every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(API_URL);

        if (!response.data || !response.data.sensorData) {
          console.warn("No sensor data received from API");
          return;
        }

        const { sensorData, alerts } = response.data;

        // Ensure all expected sensor keys exist
        const safeSensorData = {
          temperature: sensorData.temperature || 0,
          weight: sensorData.weight || 0,
          distance: sensorData.distance || 0,
          voltage: sensorData.voltage || 0,
          soundLevel: sensorData.soundLevel || 0,
          vibration: sensorData.vibration || 0,
          totalOperatingHours: sensorData.totalOperatingHours || 0,
        };

        setSensorData(safeSensorData);
        setAlerts(alerts || []);
        setOperatingHours(safeSensorData.totalOperatingHours);

        // Append new reading while maintaining the last 20 values
        setHistory((prev) => [
          ...prev.slice(-19),
          { ...safeSensorData, timestamp: new Date().toLocaleTimeString() },
        ]);
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 5000); // Fetch every 5 seconds

    return () => clearInterval(interval); // Cleanup
  }, []);

  // ✅ Fixed: Properly formatted Operating Hours
  const formatOperatingHours = (hours) => {
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes} min`;
    } else {
      return `${hours.toFixed(1)} hrs`;
    }
  };

  // Generate Chart Data
  const generateChartData = (label, key, color) => ({
    labels: history.map((data) => data.timestamp),
    datasets: [
      {
        label: label,
        data: history.map((data) => data[key] || 0),
        borderColor: color,
        backgroundColor: "rgba(0,0,0,0.1)",
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  });

  return (
    <div className="container mt-4">
      <h2 className="text-center">📊 Real-Time Sensor Dashboard</h2>

      {/* ✅ Fixed: Correctly formatted Operating Hours */}
      <div className="alert alert-info text-center mt-3">
        ⏳ <strong>Operating Hours:</strong>{" "}
        {formatOperatingHours(operatingHours)}
      </div>

      <div className="row mt-3">
        <div className="col-md-6">
          <div className="card p-3">
            <h5>🌡 Temperature (°C)</h5>
            <Line
              data={generateChartData("Temperature", "temperature", "red")}
            />
          </div>
        </div>

        <div className="col-md-6">
          <div className="card p-3">
            <h5>⚖ Load Weight (kg)</h5>
            <Line data={generateChartData("Weight", "weight", "blue")} />
          </div>
        </div>

        <div className="col-md-6 mt-3">
          <div className="card p-3">
            <h5>📏 Distance (cm)</h5>
            <Line data={generateChartData("Distance", "distance", "green")} />
          </div>
        </div>

        <div className="col-md-6 mt-3">
          <div className="card p-3">
            <h5>🔌 Voltage (V)</h5>
            <Line data={generateChartData("Voltage", "voltage", "purple")} />
          </div>
        </div>

        <div className="col-md-6 mt-3">
          <div className="card p-3">
            <h5>🔊 Sound Level (dB)</h5>
            <Line
              data={generateChartData("Sound Level", "soundLevel", "orange")}
            />
          </div>
        </div>

        <div className="col-md-6 mt-3">
          <div className="card p-3">
            <h5>📳 Vibration</h5>
            <Line data={generateChartData("Vibration", "vibration", "brown")} />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="mt-4">
        <h4>🚨 Alerts & Troubleshooting</h4>
        {alerts.length > 0 ? (
          alerts.map((alert, index) => (
            <div key={index} className="alert alert-danger">
              <strong>{alert.alert}</strong> <br />
              💡 {alert.suggestion}
            </div>
          ))
        ) : (
          <div className="alert alert-success">✅ All systems normal.</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
