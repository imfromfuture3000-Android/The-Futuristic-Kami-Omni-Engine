#!/bin/bash

# Azure Infrastructure Setup Script for Empire Engine
# Creates all required Azure resources for multi-chain profit optimization

set -e

# Configuration
RESOURCE_GROUP="Empire-RG"
LOCATION="eastus"
ACR_NAME="empireacr"
KEY_VAULT_NAME="empire-kv"
POSTGRES_SERVER="empire-db"
AKS_CLUSTER="empire-aks"
POSTGRES_ADMIN_USER="empireAdmin"
POSTGRES_ADMIN_PASSWORD="${POSTGRES_ADMIN_PASSWORD:-$(openssl rand -base64 32)}"

echo "🚀 Starting Empire Engine Azure Infrastructure Setup..."
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"

# Step 1: Create Resource Group
echo "📁 Creating Resource Group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags project=EmpireEngine environment=production

# Step 2: Create Azure Container Registry
echo "📦 Creating Azure Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Standard \
  --admin-enabled true

# Step 3: Create Azure Key Vault
echo "🔐 Creating Azure Key Vault..."
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-soft-delete true \
  --soft-delete-retention-days 90 \
  --enable-rbac-authorization false

# Step 4: Create Postgres Flexible Server
echo "🗄️ Creating Postgres Flexible Server..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --location $LOCATION \
  --admin-user $POSTGRES_ADMIN_USER \
  --admin-password "$POSTGRES_ADMIN_PASSWORD" \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 14

# Configure Postgres firewall to allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Step 5: Create AKS Cluster
echo "☸️ Creating AKS Cluster..."
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER \
  --location $LOCATION \
  --node-count 3 \
  --node-vm-size Standard_B2s \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 5 \
  --enable-managed-identity \
  --attach-acr $ACR_NAME \
  --generate-ssh-keys

# Step 6: Enable AKS to access Key Vault
echo "🔗 Configuring AKS access to Key Vault..."
AKS_IDENTITY=$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query identity.principalId -o tsv)
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $AKS_IDENTITY \
  --secret-permissions get list

# Step 7: Install Azure Key Vault Provider for Secrets Store CSI Driver
echo "🔌 Installing Key Vault CSI Driver..."
az aks enable-addons \
  --addons azure-keyvault-secrets-provider \
  --name $AKS_CLUSTER \
  --resource-group $RESOURCE_GROUP

# Step 8: Store secrets in Key Vault
echo "🔐 Storing secrets in Key Vault..."

# Generate Postgres connection string
POSTGRES_CONN_STRING="postgresql://$POSTGRES_ADMIN_USER:$POSTGRES_ADMIN_PASSWORD@$POSTGRES_SERVER.postgres.database.azure.com:5432/postgres?sslmode=require"

# Store secrets (these will be populated with actual values)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "helius-rpc" --value "${HELIUS_RPC:-placeholder-helius-rpc}"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "quicknode-rpc" --value "${QUICKNODE_RPC:-placeholder-quicknode-rpc}"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "infura-rpc" --value "${INFURA_RPC:-placeholder-infura-rpc}"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "solana-private-key" --value "${SOLANA_PRIVATE_KEY:-placeholder-sol-key}"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "ethereum-private-key" --value "${ETHEREUM_PRIVATE_KEY:-placeholder-eth-key}"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "postgres-conn-string" --value "$POSTGRES_CONN_STRING"

# Owner addresses (from problem statement)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "owner-address-sol" --value "4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "owner-address-eth" --value "0x4B1a58A3057d03888510d93B52ABad9Fee9b351d"

# Step 9: Enable monitoring
echo "📊 Enabling Azure Monitor for AKS..."
az aks enable-addons \
  --addons monitoring \
  --name $AKS_CLUSTER \
  --resource-group $RESOURCE_GROUP

# Step 10: Get AKS credentials
echo "🔑 Getting AKS credentials..."
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER \
  --overwrite-existing

echo "✅ Azure Infrastructure Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  ACR: $ACR_NAME"
echo "  Key Vault: $KEY_VAULT_NAME"
echo "  Postgres: $POSTGRES_SERVER"
echo "  AKS: $AKS_CLUSTER"
echo "  Postgres Admin Password: $POSTGRES_ADMIN_PASSWORD"
echo ""
echo "🔗 ACR Login Command:"
echo "  az acr login --name $ACR_NAME"
echo ""
echo "☸️ kubectl context should now be set to your AKS cluster"
echo "📁 Save this postgres password securely: $POSTGRES_ADMIN_PASSWORD"