#!/bin/bash

echo "Starting local automated deployment..."

echo "Stopping old containers..."
docker compose down

echo "Rebuilding and starting new containers..."
docker compose up -d --build

echo "Deployment completed successfully."