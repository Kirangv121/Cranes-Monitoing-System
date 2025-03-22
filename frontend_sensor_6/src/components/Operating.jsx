import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/get-sensor";

const Operating = () => {
  const [operatingHours, setOperatingHours] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(API_URL);
        const { sensorData } = response.data;

        if (
          sensorData &&
          typeof sensorData.totalOperatingHours !== "undefined"
        ) {
          setOperatingHours(sensorData.totalOperatingHours);
        }
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <div className="alert alert-info">
      ⏳ <strong>Operating Hours:</strong> {operatingHours.toFixed(2)} hrs
    </div>
  );
};

export default Operating;
