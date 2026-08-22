FROM node:20-alpine

WORKDIR /app

# Copy gateway package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production

# Run the server using ts-node
CMD ["npm", "start"]
