-- Tankuy Database Schema
-- Run this to initialize your MySQL database

CREATE DATABASE IF NOT EXISTS tankuy;
USE tankuy;

-- Users table (Google OAuth data)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_google_id (google_id),
    INDEX idx_email (email)
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    license_plate VARCHAR(20),
    fuel_type ENUM('petrol', 'diesel', 'lpg', 'electric', 'hybrid') DEFAULT 'petrol',
    brand VARCHAR(100),
    model VARCHAR(100),
    year INT,
    engine VARCHAR(100),
    engine_power VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Fuel entries table
CREATE TABLE IF NOT EXISTS fuel_entries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36),
    station_name VARCHAR(255),
    station_address VARCHAR(500),
    station_lat DECIMAL(10, 8),
    station_lng DECIMAL(11, 8),
    date DATE NOT NULL,
    time TIME,
    price_per_liter DECIMAL(10, 2),
    total_liters DECIMAL(10, 2),
    total_cost DECIMAL(10, 2) NOT NULL,
    mileage INT,
    receipt_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_date (date)
);

-- Device tokens for remember me functionality
CREATE TABLE IF NOT EXISTS device_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    refresh_token TEXT NOT NULL,
    device_name VARCHAR(255),
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    UNIQUE INDEX idx_device_id (device_id)
);
