Write-Host "Starting local automated deployment..."

Write-Host "Removing old CertExt containers if they exist..."
docker rm -f cert_extract_app-main-backend-1 2>$null
docker rm -f cert_extract_app-main-frontend-1 2>$null
docker rm -f cert_extract_app-backend-1 2>$null
docker rm -f cert_extract_app-frontend-1 2>$null

Write-Host "Stopping old Docker Compose containers..."
docker compose down --remove-orphans

Write-Host "Rebuilding and starting new containers..."
docker compose up -d --build

Write-Host "Deployment completed successfully."