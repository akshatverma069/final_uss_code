#!/bin/bash

# Remote service management helper
# Allows you to manage the service on remote server without SSHing manually
# Usage: ./manage-remote.sh {start|stop|restart|status|logs} [config_file]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load configuration
CONFIG_FILE="${2:-deploy.config}"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

source "$CONFIG_FILE"

if [ -z "$DEPLOY_IP" ] || [ -z "$DEPLOY_USER" ]; then
    echo -e "${RED}❌ Missing required configuration: DEPLOY_IP and DEPLOY_USER${NC}"
    exit 1
fi

REMOTE_DIR="${REMOTE_DIR:-password-manager-backend}"
COMMAND="${1:-status}"

# Build SSH command
if [ -n "$DEPLOY_PASSWORD" ]; then
    SSH_CMD="sshpass -p '${DEPLOY_PASSWORD}' ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_IP}"
else
    SSH_CMD="ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_IP}"
fi

# Execute command on remote server
case "$COMMAND" in
    start|stop|restart|status)
        echo -e "${BLUE}Executing '$COMMAND' on ${DEPLOY_USER}@${DEPLOY_IP}...${NC}"
        $SSH_CMD "cd ~/${REMOTE_DIR} && ./run-service.sh $COMMAND"
        ;;
    logs)
        echo -e "${BLUE}Showing logs from ${DEPLOY_USER}@${DEPLOY_IP}...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        $SSH_CMD "cd ~/${REMOTE_DIR} && tail -f app.log"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs} [config_file]"
        echo ""
        echo "Commands:"
        echo "  start   - Start the backend service on remote server"
        echo "  stop    - Stop the backend service on remote server"
        echo "  restart - Restart the backend service on remote server"
        echo "  status  - Check service status on remote server"
        echo "  logs    - Show service logs from remote server"
        exit 1
        ;;
esac