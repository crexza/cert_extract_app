Write-Host "Starting local automated deployment..."

Write-Host "Stopping and removing containers using ports 3000 and 8000 if they exist..."

$containers = docker ps -aq --filter "publish=3000"
if ($containers) {
    docker rm -f $containers
}

$containers = docker ps -aq --filter "publish=8000"
if ($containers) {
    docker rm -f $containers
}

Write-Host "Stopping old Docker Compose containers..."
docker compose down --remove-orphans

Write-Host "Rebuilding and starting new containers..."
docker compose up -d --build

Write-Host "Deployment completed successfully."