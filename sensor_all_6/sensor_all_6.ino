#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include "HX711.h"

// *WiFi Credentials*
const char* ssid = "CITNC-Staff";
const char* password = "Citnc#@2024#@";

// *Backend Server URL*
const char* serverUrl = "http://130.1.39.201:5000/sensor-data";

// *Temperature Sensor (DHT11)*
#define DHTPIN 27
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// *Load Sensor (HX711)*
#define LOADCELL_DOUT_PIN 14
#define LOADCELL_SCK_PIN 13
HX711 scale;
float calibration_factor = -7050.0;

// *Ultrasonic Sensor*
#define TRIG_PIN 5
#define ECHO_PIN 18

// *Voltage Sensor (ZMPT101B)*
#define ZMPT_PIN 34
const float VCC = 3.3;
const int ADC_MAX = 4095;
const float VOLTAGE_CALIBRATION_FACTOR = 0.106;

// *Sound Sensor*
#define SOUND_SENSOR_AO 35
#define SOUND_SENSOR_DO 15
const int SOUND_SAMPLES = 50;
float soundHistory[3] = {0};
int soundHistoryIndex = 0;

// *Vibration Sensor*
#define VIBRATION_PIN 32
#define BUILT_IN_LED 2
const int VIBRATION_THRESHOLD = 600;
bool ledState = false;
unsigned long ledTimer = 0;

// *Operating Hours Calculation using Voltage Sensor*
unsigned long lastRunTime = 0;
float totalOperatingHours = 0;
const float VOLTAGE_THRESHOLD = 2.5;

// *WiFi Connection*
void connectWiFi() {
    Serial.print("🔗 Connecting to WiFi...");
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ Connected!");
    } else {
        Serial.println("\n❌ WiFi Connection Failed! Restarting...");
        ESP.restart();
    }
}

// *Read AC Voltage (ZMPT101B)*
float readACVoltage() {
    const int SAMPLES = 1000;
    float sumSquared = 0.0, offset = VCC / 2.0;
    for (int i = 0; i < SAMPLES; i++) {
        int raw = analogRead(ZMPT_PIN);
        float voltage = (raw * VCC) / ADC_MAX;
        sumSquared += pow(voltage - offset, 2);
        delayMicroseconds(50);
    }
    return sqrt(sumSquared / SAMPLES) * VOLTAGE_CALIBRATION_FACTOR * 100.0;
}

// *Read Sound Level*
float readSoundLevel() {
    long sum = 0, minVal = ADC_MAX, maxVal = 0;
    for (int i = 0; i < SOUND_SAMPLES; i++) {
        int raw = analogRead(SOUND_SENSOR_AO);
        sum += raw;
        minVal = min((float)minVal, (float)raw);
        maxVal = max((float)maxVal, (float)raw);
        delayMicroseconds(400);
    }
    float voltage = ((maxVal - minVal) * VCC) / ADC_MAX;
    float dB = 20.0 * log10(max(voltage, 0.00002f) / 0.00002f) - 10.0;
    soundHistory[soundHistoryIndex] = constrain(dB, 20.0, 120.0);
    soundHistoryIndex = (soundHistoryIndex + 1) % 3;
    
    float avgDB = 0;
    for (int i = 0; i < 3; i++) avgDB += soundHistory[i];
    return avgDB / 3;
}

// *Read Vibration Sensor*
int readVibration() {
    return analogRead(VIBRATION_PIN);
}

// *Update Operating Hours Calculation*
void updateOperatingHours(float voltage) {
    if (voltage >= VOLTAGE_THRESHOLD) { 
        unsigned long currentTime = millis();
        if (lastRunTime > 0) {
            totalOperatingHours += (currentTime - lastRunTime) / (1000.0 * 60.0 * 60.0);
        }
        lastRunTime = currentTime;
    }
}

void setup() {
    Serial.begin(115200);
    connectWiFi();

    dht.begin();
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(SOUND_SENSOR_DO, INPUT);
    pinMode(BUILT_IN_LED, OUTPUT);

    scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
    scale.set_scale(calibration_factor);
    scale.tare();
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠ WiFi Disconnected! Reconnecting...");
        connectWiFi();
        return;
    }

    // *Temperature Sensor*
    float temperature = dht.readTemperature();
    Serial.printf("🌡 Temperature: %.1f°C\n", temperature);

    // *Load Cell Sensor*
    float weight = scale.is_ready() ? max(0.0f, scale.get_units(5)) : -1.0;
    Serial.printf("⚖ Load Weight: %.2f kg\n", weight);

    // *Ultrasonic Sensor*
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    long duration = pulseIn(ECHO_PIN, HIGH);
    float distance = (duration * 0.0343) / 2;
    Serial.printf("📏 Distance: %.2f cm\n", distance);

    // *Voltage Monitoring*
    float voltage = readACVoltage();
    Serial.printf("🔌 Voltage: %.1f V\n", voltage);

    // *Sound Monitoring*
    float soundDB = readSoundLevel();
    Serial.printf("🔊 Sound Level: %.1f dB | Digital: %d\n", soundDB, digitalRead(SOUND_SENSOR_DO));

    // *Vibration Monitoring*
    int vibration = readVibration();
    Serial.printf("📳 Vibration: %d\n", vibration);

    if (vibration > VIBRATION_THRESHOLD && !ledState) {
        Serial.println("⚠ ALERT! High vibration detected!");
        digitalWrite(BUILT_IN_LED, HIGH);
        ledState = true;
        ledTimer = millis();
    }
    if (ledState && millis() - ledTimer > 1000) {
        digitalWrite(BUILT_IN_LED, LOW);
        ledState = false;
    }

    // *Update Operating Hours*
    updateOperatingHours(voltage);
    Serial.printf("⏳ Operating Hours: %.2f hrs\n", totalOperatingHours);

    // *Send Data to Backend*
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"temperature\":" + String(temperature) +
                         ", \"weight\":" + String(weight) +
                         ", \"distance\":" + String(distance) +
                         ", \"voltage\":" + String(voltage, 1) +
                         ", \"soundLevel\":" + String(soundDB, 1) +
                         ", \"vibration\":" + String(vibration) + 
                         ", \"operatingHours\":" + String(totalOperatingHours, 2) + "}";

    int httpResponseCode = http.POST(jsonPayload);
    Serial.printf("📡 Sent Data - Response Code: %d\n", httpResponseCode);
    http.end();

    delay(1000);
}
