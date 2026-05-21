Write-Host "Starting local automated deployment..."

Write-Host "Stopping old containers..."
docker compose down

Write-Host "Rebuilding and starting new containers..."
docker compose up -d --build

Write-Host "Deployment completed successfully."