FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Pre-fetch ephemeris data
RUN npm run fetch-ephemeris

EXPOSE 5199

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
