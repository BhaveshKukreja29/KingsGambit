# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Make port 9000 available to the world outside this container
EXPOSE 9000

# Define the command to run the app
CMD [ "npm", "start" ]