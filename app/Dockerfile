FROM node:20-alpine

WORKDIR /app

# Install dependencies globally needed for Expo
RUN npm install -g expo-cli

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8081

# Setting the packager hostname is critical for the QR code to point to the VPS IP
CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
