FROM node:18-slim

WORKDIR /app
COPY package.json .
RUN npm install -f
COPY . .
RUN npm run build

# EXPOSE 6379
EXPOSE 3000

CMD ["npm", "start"]