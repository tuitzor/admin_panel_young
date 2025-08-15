﻿FROM node:18
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend .
CMD ["node", "src/index.js"]