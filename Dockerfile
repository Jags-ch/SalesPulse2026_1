# Dockerfile for SalesPulse360 CAP service
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx cds build --production || true
EXPOSE 4004
CMD [ "npm", "start" ]
