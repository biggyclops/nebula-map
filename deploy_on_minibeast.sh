#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="comea"
DEPLOY_GROUP="comea"
DEPLOY_DIR="/opt/astra-nebula"
ZIP_FILE="/tmp/astra-nebula-deploy.zip"
SERVICE_NAME="astra-nebula"

echo -e "${GREEN}🚀 Starting AsTrA Nebula deployment on Mini-Beast${NC}"

# Step 1: Create directory and unzip
echo -e "\n${YELLOW}[1/7] Creating deployment directory and extracting archive...${NC}"
if [ ! -f "$ZIP_FILE" ]; then
    echo -e "${RED}❌ Error: $ZIP_FILE not found${NC}"
    exit 1
fi

sudo mkdir -p "$DEPLOY_DIR"
sudo chown "$DEPLOY_USER:$DEPLOY_GROUP" "$DEPLOY_DIR"

# Extract zip (handle nested folder if present)
cd /tmp
TEMP_DIR=$(mktemp -d)
unzip -q "$ZIP_FILE" -d "$TEMP_DIR"

# Check if there's a nested folder (common with zip creation)
if [ -d "$TEMP_DIR/nebula-map" ]; then
    sudo cp -r "$TEMP_DIR/nebula-map"/* "$DEPLOY_DIR/"
elif [ -d "$TEMP_DIR/astra-nebula" ]; then
    sudo cp -r "$TEMP_DIR/astra-nebula"/* "$DEPLOY_DIR/"
else
    sudo cp -r "$TEMP_DIR"/* "$DEPLOY_DIR/"
fi

sudo chown -R "$DEPLOY_USER:$DEPLOY_GROUP" "$DEPLOY_DIR"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}✅ Extracted to $DEPLOY_DIR${NC}"

# Step 2: Install Ubuntu dependencies
echo -e "\n${YELLOW}[2/7] Checking Ubuntu dependencies...${NC}"
if ! dpkg -l | grep -q python3-venv; then
    echo "Installing python3-venv..."
    sudo apt-get update -qq
    sudo apt-get install -y python3-venv python3-pip
else
    echo -e "${GREEN}✅ python3-venv already installed${NC}"
fi

# Step 3: Create venv and install Python dependencies
echo -e "\n${YELLOW}[3/7] Creating virtual environment and installing dependencies...${NC}"
cd "$DEPLOY_DIR"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "${GREEN}✅ Created virtual environment${NC}"
else
    echo -e "${GREEN}✅ Virtual environment already exists${NC}"
fi

source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet fastapi uvicorn psutil httpx
echo -e "${GREEN}✅ Python dependencies installed${NC}"

# Step 4: Install systemd service
echo -e "\n${YELLOW}[4/7] Installing systemd service...${NC}"
SERVICE_FILE="$DEPLOY_DIR/scripts/systemd/astra-nebula.service"
if [ ! -f "$SERVICE_FILE" ]; then
    echo -e "${RED}❌ Error: Service file not found at $SERVICE_FILE${NC}"
    exit 1
fi

# Create temporary service file with correct paths
TEMP_SERVICE=$(mktemp)
sed -e "s|User=ubuntu|User=$DEPLOY_USER|g" \
    -e "s|Group=ubuntu|Group=$DEPLOY_GROUP|g" \
    -e "s|WorkingDirectory=/opt/astra-nebula|WorkingDirectory=$DEPLOY_DIR|g" \
    -e "s|ExecStart=/opt/astra-nebula/.venv/bin/uvicorn|ExecStart=$DEPLOY_DIR/.venv/bin/uvicorn|g" \
    "$SERVICE_FILE" > "$TEMP_SERVICE"

sudo cp "$TEMP_SERVICE" /etc/systemd/system/${SERVICE_NAME}.service
rm "$TEMP_SERVICE"
echo -e "${GREEN}✅ Service file installed${NC}"

# Step 5: Enable and start service
echo -e "\n${YELLOW}[5/7] Enabling and starting service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}.service

if sudo systemctl start ${SERVICE_NAME}.service; then
    echo -e "${GREEN}✅ Service started${NC}"
    sleep 2
else
    echo -e "${RED}❌ Service failed to start${NC}"
    echo -e "\n${YELLOW}Service status:${NC}"
    sudo systemctl status ${SERVICE_NAME} || true
    echo -e "\n${YELLOW}Recent logs:${NC}"
    sudo journalctl -u ${SERVICE_NAME} -n 120 --no-pager || true
    exit 1
fi

# Step 6: Test health endpoint
echo -e "\n${YELLOW}[6/7] Testing health endpoint...${NC}"
sleep 2
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://127.0.0.1:8000/api/health > /dev/null; then
        HEALTH_RESPONSE=$(curl -s http://127.0.0.1:8000/api/health)
        echo -e "${GREEN}✅ Health check passed: $HEALTH_RESPONSE${NC}"
        HEALTH_OK=true
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Retry $RETRY_COUNT/$MAX_RETRIES..."
        sleep 2
    fi
done

if [ "$HEALTH_OK" = false ]; then
    echo -e "${RED}❌ Health check failed after $MAX_RETRIES retries${NC}"
    echo -e "\n${YELLOW}Service status:${NC}"
    sudo systemctl status ${SERVICE_NAME} || true
    echo -e "\n${YELLOW}Recent logs:${NC}"
    sudo journalctl -u ${SERVICE_NAME} -n 120 --no-pager || true
    exit 1
fi

# Step 7: Configure Tailscale serve
echo -e "\n${YELLOW}[7/7] Configuring Tailscale serve...${NC}"
if sudo tailscale serve --bg http://127.0.0.1:8000; then
    echo -e "${GREEN}✅ Tailscale serve configured${NC}"
    echo -e "\n${YELLOW}Tailscale serve status:${NC}"
    sudo tailscale serve status || true
else
    echo -e "${RED}❌ Failed to configure Tailscale serve${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "\nService is running at: http://127.0.0.1:8000"
echo -e "Accessible via Tailscale at your machine's hostname"
echo -e "\nUseful commands:"
echo -e "  View logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo -e "  Restart:   sudo systemctl restart ${SERVICE_NAME}"
echo -e "  Status:    sudo systemctl status ${SERVICE_NAME}"
