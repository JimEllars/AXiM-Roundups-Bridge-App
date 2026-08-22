FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Install dependencies (only production if possible, but ts-node and typescript might be in devDependencies)
# We will just run npm ci since we need ts-node to run the worker
RUN npm ci

# Copy temporal files
COPY temporal/ ./temporal/

# Set production environment
ENV NODE_ENV=production

# Run the worker using the npm script defined in root package.json
CMD ["npm", "run", "start:worker"]
