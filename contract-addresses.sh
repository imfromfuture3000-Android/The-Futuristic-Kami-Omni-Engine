#!/bin/bash

# Contract Address Quick Access - AI Empire 2089
# Quick shell script for accessing contract addresses

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_FILE="$SCRIPT_DIR/contract-addresses.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_colored() {
    echo -e "${1}${2}${NC}"
}

# Function to get Solana program ID
get_solana_program() {
    if [ -f "$REGISTRY_FILE" ]; then
        jq -r '.networks.solana."mainnet-beta".contracts."primary-program".programId' "$REGISTRY_FILE" 2>/dev/null
    else
        echo "Registry file not found: $REGISTRY_FILE"
        return 1
    fi
}

# Function to get Azure services
get_azure_services() {
    if [ -f "$REGISTRY_FILE" ]; then
        jq -r '.networks.azure.demo.services' "$REGISTRY_FILE" 2>/dev/null
    else
        echo "Registry file not found: $REGISTRY_FILE"
        return 1
    fi
}

# Function to get empire metrics
get_empire_metrics() {
    if [ -f "$REGISTRY_FILE" ]; then
        jq -r '.["empire-metrics"]' "$REGISTRY_FILE" 2>/dev/null
    else
        echo "Registry file not found: $REGISTRY_FILE"
        return 1
    fi
}

# Function to show all addresses
show_all() {
    print_colored $BLUE "\n🤖 AI Empire Contract Addresses - 2089"
    print_colored $BLUE "="*50

    # Solana
    print_colored $GREEN "\n🌐 Solana Mainnet-Beta:"
    SOLANA_PROGRAM=$(get_solana_program)
    if [ "$SOLANA_PROGRAM" != "null" ] && [ -n "$SOLANA_PROGRAM" ]; then
        echo "   Program ID: $SOLANA_PROGRAM"
        echo "   Explorer: https://solscan.io/account/$SOLANA_PROGRAM"
    else
        print_colored $RED "   No active Solana deployments"
    fi

    # Azure
    print_colored $GREEN "\n☁️ Azure Cloud (Demo):"
    AZURE_SERVICES=$(get_azure_services)
    if [ "$AZURE_SERVICES" != "null" ] && [ -n "$AZURE_SERVICES" ]; then
        echo "$AZURE_SERVICES" | jq -r 'to_entries[] | "   \(.key): \(.value.name // .value.account // .value)"' 2>/dev/null
    else
        print_colored $RED "   No Azure services found"
    fi

    # Metrics
    print_colored $GREEN "\n📊 Empire Metrics:"
    METRICS=$(get_empire_metrics)
    if [ "$METRICS" != "null" ] && [ -n "$METRICS" ]; then
        echo "$METRICS" | jq -r '"   Total Value: $\(.totalValue // 0)\n   Active Services: \(.activeServices // 0)\n   Contracts Deployed: \(.contractsDeployed // 0)"' 2>/dev/null
    fi

    print_colored $BLUE "\n✨ Quick Access Commands:"
    echo "   ./contract-addresses.sh solana    - Get Solana program ID"
    echo "   ./contract-addresses.sh azure     - Get Azure services"
    echo "   ./contract-addresses.sh metrics   - Get empire metrics"
    echo "   ./contract-addresses.sh all       - Show all addresses"

    print_colored $YELLOW "\n🔗 Useful Links:"
    SOLANA_PROGRAM=$(get_solana_program)
    if [ "$SOLANA_PROGRAM" != "null" ] && [ -n "$SOLANA_PROGRAM" ]; then
        echo "   Solana Explorer: https://solscan.io/account/$SOLANA_PROGRAM"
    fi
    echo "   Azure Portal: https://portal.azure.com"
    echo "   Empire Dashboard: http://localhost:3002"

    echo ""
}

# Main script logic
case "$1" in
    "solana")
        SOLANA_PROGRAM=$(get_solana_program)
        if [ "$SOLANA_PROGRAM" != "null" ] && [ -n "$SOLANA_PROGRAM" ]; then
            echo "$SOLANA_PROGRAM"
        else
            print_colored $RED "No Solana program ID found"
            exit 1
        fi
        ;;
    "azure")
        get_azure_services
        ;;
    "metrics")
        get_empire_metrics
        ;;
    "all"|"summary"|"list")
        show_all
        ;;
    "help"|"-h"|"--help")
        echo "Contract Address Quick Access - AI Empire 2089"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  solana    - Get Solana program ID"
        echo "  azure     - Get Azure services (JSON)"
        echo "  metrics   - Get empire metrics (JSON)"
        echo "  all       - Show formatted summary of all addresses"
        echo "  summary   - Alias for 'all'"
        echo "  list      - Alias for 'all'"
        echo "  help      - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 solana"
        echo "  $0 all"
        echo "  $0 metrics | jq .totalValue"
        ;;
    *)
        show_all
        ;;
esac