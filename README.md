# The Futuristic Kami Omni Engine

A comprehensive blockchain and cloud deployment platform with Azure integration capabilities.

## 🚀 Quick Start

### Azure Dashboard Deployment

Deploy the dashboard to Azure Container Apps in just a few commands:

```bash
# 1. Check deployment readiness
npm run azure:preflight

# 2. Login to Azure
npm run azure:login

# 3. Deploy dashboard
npm run azure:deploy:dashboard
```

### Available Commands

#### Azure Authentication
- `npm run azure:status` - Check authentication status
- `npm run azure:login` - Login with device code (recommended)
- `npm run azure:login:device` - Device code login
- `npm run azure:login:interactive` - Interactive browser login
- `npm run azure:logout` - Logout from Azure

#### Azure Deployment
- `npm run azure:preflight` - Run pre-flight deployment checks
- `npm run azure:demo` - Interactive demo and guidance
- `npm run azure:deploy:dashboard` - Deploy dashboard to Container Apps
- `npm run azure:subscriptions` - List available subscriptions

#### Dashboard Development
- `npm run dashboard:dev` - Run dashboard in development mode
- `npm run dashboard:build` - Build dashboard for production
- `npm run dashboard:docker:build` - Build Docker image locally

## 📖 Documentation

- [Azure Deployment Guide](./AZURE_DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Azure Integration README](./AZURE-INTEGRATION-README.md) - Detailed Azure integration docs

## 🏗️ Architecture

The platform supports deployment to:
- **Azure Container Apps** - Serverless container platform
- **Azure Container Registry** - Private container registry
- **Azure Resource Groups** - Organized resource management

## 🔧 Prerequisites

- Node.js 18+
- Azure CLI (pre-installed)
- Azure subscription with appropriate permissions

## 🎯 Getting Started

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd The-Futuristic-Kami-Omni-Engine
   ```

2. **Check readiness:**
   ```bash
   npm run azure:preflight
   ```

3. **Login to Azure:**
   ```bash
   npm run azure:login
   ```

4. **Deploy dashboard:**
   ```bash
   npm run azure:deploy:dashboard
   ```

## 🔐 Authentication

The platform supports multiple Azure authentication methods:
- **Device Code** - Best for CI/CD and automation
- **Interactive** - Opens browser for authentication
- **Service Principal** - For production automation

## 📊 Monitoring

After deployment, monitor your application:
- Check deployment logs
- View application metrics
- Configure alerts and monitoring

## 🤝 Contributing

Please read the contribution guidelines and ensure all deployments are tested.

## 📄 License

This project is licensed under the MIT License.