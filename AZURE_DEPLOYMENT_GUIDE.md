# Azure Container Apps Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Empire Dashboard to Azure Container Apps using the automated deployment scripts.

## Prerequisites

- Node.js 18+ installed
- Azure CLI installed (already available)
- Azure subscription with appropriate permissions
- Docker (for local testing, optional)

## Quick Start

### 1. Azure Authentication

First, authenticate with Azure using one of the available methods:

```bash
# Device Code Login (Recommended for CI/CD)
npm run azure:login:device

# Interactive Login (Opens browser)
npm run azure:login:interactive

# Check authentication status
npm run azure:status
```

### 2. Deploy Dashboard to Azure Container Apps

Once authenticated, deploy the dashboard:

```bash
# Full deployment to Azure Container Apps
npm run azure:deploy:dashboard
```

This command will:
- Create a resource group (`empire-dashboard-rg`)
- Set up Azure Container Registry
- Build and push the Docker image
- Create Container Apps environment
- Deploy the dashboard application
- Provide the public URL

## Available Scripts

### Azure Authentication
- `npm run azure:login` - Login with device code
- `npm run azure:login:device` - Device code login
- `npm run azure:login:interactive` - Interactive browser login
- `npm run azure:status` - Check authentication status
- `npm run azure:subscriptions` - List available subscriptions
- `npm run azure:logout` - Logout from Azure

### Dashboard Deployment
- `npm run azure:deploy:dashboard` - Deploy to Azure Container Apps
- `npm run dashboard:build` - Build dashboard locally
- `npm run dashboard:dev` - Run dashboard in development mode
- `npm run dashboard:docker:build` - Build Docker image locally

## Manual Step-by-Step Deployment

If you prefer manual deployment or need to customize the process:

### 1. Login to Azure
```bash
node azure-login.js device-code
```

### 2. Verify Authentication
```bash
node azure-login.js status
```

### 3. Deploy Container Apps
```bash
node azure-container-apps-deploy.js
```

## Architecture

The deployment creates the following Azure resources:

- **Resource Group**: `empire-dashboard-rg`
- **Container Registry**: `empiredashboardacr[random]`
- **Container Apps Environment**: `empire-dashboard-env`
- **Container App**: `empire-dashboard-app`

## Configuration

### Resource Naming
You can customize resource names by editing the deployment script:

```javascript
// In azure-container-apps-deploy.js
this.resourceGroup = 'your-resource-group';
this.containerAppName = 'your-app-name';
```

### Application Settings
The deployed app runs with the following configuration:
- **Port**: 3000
- **CPU**: 0.25 cores
- **Memory**: 0.5Gi
- **Replicas**: 1-3 (auto-scaling)
- **Ingress**: External HTTPS

## Monitoring and Management

After deployment, you can:

1. **View the application**: Use the provided URL from deployment output
2. **Monitor logs**: `az containerapp logs show --name empire-dashboard-app --resource-group empire-dashboard-rg`
3. **Scale the app**: `az containerapp update --name empire-dashboard-app --resource-group empire-dashboard-rg --min-replicas 2 --max-replicas 5`
4. **Update the app**: Re-run the deployment script

## Troubleshooting

### Authentication Issues
- Ensure you're logged in: `npm run azure:status`
- Try different login method: `npm run azure:login:interactive`
- Check subscription access: `npm run azure:subscriptions`

### Deployment Issues
- Check Azure CLI version: `az version`
- Verify permissions: Ensure you have Contributor role on subscription
- Check resource naming conflicts: Resource names must be globally unique

### Application Issues
- Check container logs: `az containerapp logs show --name empire-dashboard-app --resource-group empire-dashboard-rg --follow`
- Verify image build: Check Azure Container Registry for image
- Test locally: `npm run dashboard:docker:build && docker run -p 3000:3000 empire-dashboard`

## Cost Optimization

The default configuration is optimized for development/testing:
- Basic Container Registry ($5/month)
- Container Apps consumption plan (pay-per-use)
- Minimal CPU/memory allocation

For production, consider:
- Standard Container Registry for geo-replication
- Dedicated Container Apps environment
- Higher resource allocation based on load

## Security

The deployment follows Azure security best practices:
- Uses managed identity where possible
- HTTPS-only ingress
- Private Container Registry with admin access
- Resource group isolation

## Next Steps

After successful deployment:
1. Configure custom domain (optional)
2. Set up monitoring and alerts
3. Configure CI/CD pipeline
4. Implement backup strategies
5. Set up staging environment

## Support

For issues or questions:
1. Check the deployment logs
2. Review Azure documentation
3. Contact Azure support for subscription issues