#!/bin/bash

# User-space service manager (NO SUDO REQUIRED)
# Manages the backend service using nohup and process management
# Usage: ./run-service.sh {start|stop|restart|status|logs}

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_DIR="$SCRIPT_DIR"
VENV_DIR="${APP_DIR}/venv"
PYTHON_BIN="${VENV_DIR}/bin/python"
UVICORN_BIN="${VENV_DIR}/bin/uvicorn"
PID_FILE="${APP_DIR}/app.pid"
LOG_FILE="${APP_DIR}/app.log"
ERROR_LOG="${APP_DIR}/app.error.log"

# Load port from .env if available
if [ -f "${APP_DIR}/.env" ]; then
    API_PORT=$(grep "^PORT=" "${APP_DIR}/.env" | cut -d'=' -f2 | tr -d '"' || echo "8000")
else
    API_PORT="8000"
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if service is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            # PID file exists but process is dead
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Start the service
start_service() {
    if is_running; then
        echo -e "${YELLOW}⚠️  Service is already running (PID: $(cat $PID_FILE))${NC}"
        return 1
    fi

    if [ ! -d "$VENV_DIR" ]; then
        echo -e "${RED}❌ Virtual environment not found. Please run setup first.${NC}"
        return 1
    fi

    echo -e "${BLUE}🚀 Starting Password Manager Backend...${NC}"
    
    # Activate venv and start uvicorn in background
    cd "$APP_DIR"
    source "${VENV_DIR}/bin/activate"
    
    nohup "$UVICORN_BIN" app.main:app \
        --host 0.0.0.0 \
        --port "$API_PORT" \
        --log-level info \
        > "$LOG_FILE" 2> "$ERROR_LOG" &
    
    PID=$!
    echo $PID > "$PID_FILE"
    
    # Wait a moment to check if it started successfully
    sleep 2
    
    if is_running; then
        echo -e "${GREEN}✅ Service started successfully!${NC}"
        echo -e "   PID: ${PID}"
        echo -e "   Port: ${API_PORT}"
        echo -e "   Logs: ${LOG_FILE}"
        echo -e "   API: http://0.0.0.0:${API_PORT}"
        return 0
    else
        echo -e "${RED}❌ Service failed to start. Check logs: ${ERROR_LOG}${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Stop the service
stop_service() {
    if ! is_running; then
        echo -e "${YELLOW}⚠️  Service is not running${NC}"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    echo -e "${BLUE}🛑 Stopping service (PID: ${PID})...${NC}"
    
    # Try graceful shutdown first
    kill "$PID" 2>/dev/null || true
    
    # Wait for process to stop
    for i in {1..10}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Force killing process...${NC}"
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
    fi
    
    rm -f "$PID_FILE"
    
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Service stopped${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to stop service${NC}"
        return 1
    fi
}

# Restart the service
restart_service() {
    echo -e "${BLUE}🔄 Restarting service...${NC}"
    stop_service
    sleep 2
    start_service
}

# Check service status
status_service() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✅ Service is running${NC}"
        echo -e "   PID: ${PID}"
        echo -e "   Port: ${API_PORT}"
        echo -e "   Logs: ${LOG_FILE}"
        
        # Check if port is listening
        if command -v netstat &> /dev/null; then
            if netstat -tuln 2>/dev/null | grep -q ":${API_PORT} "; then
                echo -e "   Port ${API_PORT} is listening"
            fi
        elif command -v ss &> /dev/null; then
            if ss -tuln 2>/dev/null | grep -q ":${API_PORT} "; then
                echo -e "   Port ${API_PORT} is listening"
            fi
        fi
        
        # Try to check health endpoint
        if command -v curl &> /dev/null; then
            if curl -s -f "http://localhost:${API_PORT}/health" > /dev/null 2>&1; then
                echo -e "   Health check: ${GREEN}OK${NC}"
            else
                echo -e "   Health check: ${YELLOW}Failed${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ Service is not running${NC}"
        return 1
    fi
}

# Show logs
show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${YELLOW}⚠️  Log file not found: ${LOG_FILE}${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📋 Showing logs (Ctrl+C to exit)...${NC}"
    tail -f "$LOG_FILE"
}

# Main command handler
case "${1:-}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        status_service
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the backend service"
        echo "  stop    - Stop the backend service"
        echo "  restart - Restart the backend service"
        echo "  status  - Check service status"
        echo "  logs    - Show service logs (follow mode)"
        exit 1
        ;;
esac