FROM node:20

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install
RUN cd server && npm install
RUN cd client && npm install

COPY . .

RUN cd client && npm run build

EXPOSE 5000

CMD ["npm", "start"]
