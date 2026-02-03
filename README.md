# Tankuy ⛽

**Tankuy** is a modern, smart fuel tracking application designed to help you monitor your vehicle's expenses, consumption, and efficiency. With a sleek dark-mode UI and AI-powered receipt scanning, managing your car's costs has never been easier.

## ✨ Key Features

- **📊 Interactive Dashboard**: Visualize your spending with beautiful, interactive charts. Switch between Weekly, Monthly, and Yearly views. Click on chart points to see exact costs and jump to detailed history.
- **📷 AI Receipt Scanning**: Snap a photo of your gas receipt, and Tankuy uses advanced OCR to automatically extract the price, liters, and station name. No more manual entry!
- **📍 Station Finder**: View nearby gas stations on an integrated map, check fuel types, and navigate to them easily.
- **📝 Comprehensive History**: specific date filtering and detailed records of every fill-up.
- **🚗 Multi-Vehicle Support**: Track stats for multiple cars independently.
- **📱 Cross-Platform**: Built with React Native & Expo for a seamless experience on both iOS and Android.

## 🛠 Tech Stack

### Frontend (Mobile App)

- **Framework**: React Native (via Expo SDK 52)
- **Routing**: Expo Router (File-based routing)
- **UI/Styling**: StyleSheet, React Native Reanimated, Vector Icons
- **Charts**: React Native Chart Kit
- **Maps**: React Native Maps
- **State Management**: React Context API

### Backend (Server)

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Image Processing**: Multer + OpenAI API (for Receipt OCR)
- **Security**: JWT Authentication

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MySQL Database
- Expo Go app on your phone (for testing)

### 1. Database Setup

Create a MySQL database named `tankuy` and import the schema (tables: `users`, `vehicles`, `fuel_entries`).

### 2. Backend Setup

Navigate to the `server` directory:

```bash
cd server
npm install
```

Create a `.env` file in the `server` folder:

```env
PORT=3000

# Database
# Use specific credentials or a connection string
DATABASE_URL=mysql://user:password@host:port/database_name

# Security
JWT_SECRET=your_jwt_secret

# Google Services (Auth & Receipt OCR)
GOOGLE_CLIENT_ID_WEB=your_web_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CLIENT_ID_IOS=your_ios_client_id
GOOGLE_CLIENT_ID_ANDROID=your_android_client_id
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key

# External APIs
OPENAI_API_KEY=your_openai_key # For Receipt OCR correction
FOURSQUARE_API_KEY=your_foursquare_key # For Station Finder
CLOUDINARY_CLOUD_NAME=your_cloud_name # For Image Storage
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Start the server:

```bash
npm run dev
```

### 3. Frontend Setup

Navigate to the `app` directory:

```bash
cd app
npm install
```

Create a `.env` file in the `app` folder:

```env
# URL of your running backend (use ngrok/tunnel for mobile testing)
EXPO_PUBLIC_API_URL=http://your-ip-or-link:3000

# Google Auth Client IDs (Must match server config)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
```

Start the application:

```bash
npx expo start --clear
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

---

Made by Dejny :D
