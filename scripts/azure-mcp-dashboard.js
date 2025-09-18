#!/usr/bin/env node

/**
 * Azure MCP Monitoring Dashboard
 * Real-time analytics and monitoring for Azure MCP Server
 */

const express = require('express');
const { DefaultAzureCredential } = require('@azure/identity');
const { MonitorClient } = require('@azure/arm-monitor');
const { CosmosClient } = require('@azure/cosmos');
const { BlobServiceClient } = require('@azure/storage-blob');
const { SecretClient } = require('@azure/keyvault-secrets');
const { WebPubSubServiceClient } = require('@azure/web-pubsub');

class AzureMCPDashboard {
  constructor() {
    this.app = express();
    this.port = process.env.DASHBOARD_PORT || 3003;
    this.credential = new DefaultAzureCredential();

    // Initialize Azure clients
    this.monitorClient = new MonitorClient(this.credential, process.env.AZURE_SUBSCRIPTION_ID);
    this.cosmosClient = new CosmosClient({
      endpoint: process.env.AZURE_COSMOS_ENDPOINT,
      key: process.env.AZURE_COSMOS_KEY,
      credential: this.credential
    });
    this.blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    this.secretClient = new SecretClient(process.env.AZURE_KEYVAULT_URL, this.credential);
    this.webPubSubClient = new WebPubSubServiceClient(process.env.AZURE_WEBPUBSUB_CONNECTION_STRING, this.credential);

    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static('public'));

    // Dashboard routes
    this.app.get('/', this.renderDashboard.bind(this));
    this.app.get('/api/metrics', this.getMetrics.bind(this));
    this.app.get('/api/mutations', this.getMutations.bind(this));
    this.app.get('/api/deployments', this.getDeployments.bind(this));
    this.app.get('/api/health', this.getHealth.bind(this));
    this.app.get('/api/realtime', this.getRealtimeData.bind(this));

    // WebSocket endpoint for real-time updates
    this.app.get('/negotiate', this.negotiateWebPubSub.bind(this));
  }

  async renderDashboard(req, res) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure MCP Dashboard - Omega Prime</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@azure/web-pubsub@1.0.0/dist/web-pubsub.min.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }
        .metric { text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #00ff88; }
        .metric-label { font-size: 0.9em; opacity: 0.8; }
        .chart-container { position: relative; height: 300px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .status.healthy { background: rgba(0, 255, 136, 0.2); border: 1px solid #00ff88; }
        .status.warning { background: rgba(255, 193, 7, 0.2); border: 1px solid #ffc107; }
        .status.error { background: rgba(255, 71, 87, 0.2); border: 1px solid #ff4757; }
        .realtime { background: rgba(0, 0, 0, 0.3); border-radius: 10px; padding: 20px; margin-top: 20px; }
        .log-entry { margin: 5px 0; padding: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧬 Azure MCP Dashboard</h1>
            <p>Omega Prime - Sacred Matrix Mutations & Cloud Analytics</p>
        </div>

        <div class="grid">
            <div class="card">
                <div class="metric">
                    <div class="metric-value" id="totalMutations">--</div>
                    <div class="metric-label">Total Mutations</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value" id="sacredMutations">--</div>
                    <div class="metric-label">Sacred Matrix Mutations</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value" id="deployments">--</div>
                    <div class="metric-label">Deployments Triggered</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value" id="uptime">--</div>
                    <div class="metric-label">System Uptime</div>
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>🧬 Mutation Trends</h3>
                <div class="chart-container">
                    <canvas id="mutationChart"></canvas>
                </div>
            </div>
            <div class="card">
                <h3>🚀 Deployment Success Rate</h3>
                <div class="chart-container">
                    <canvas id="deploymentChart"></canvas>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>📊 System Health</h3>
            <div id="healthStatus" class="status healthy">
                <strong>✅ All Systems Operational</strong>
            </div>
        </div>

        <div class="realtime">
            <h3>🔴 Real-time Activity</h3>
            <div id="realtimeLogs"></div>
        </div>
    </div>

    <script>
        let mutationChart, deploymentChart;
        let realtimeLogs = [];

        async function updateMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();

                document.getElementById('totalMutations').textContent = data.totalMutations || 0;
                document.getElementById('sacredMutations').textContent = data.sacredMatrixMutations || 0;
                document.getElementById('deployments').textContent = data.deploymentsTriggered || 0;
                document.getElementById('uptime').textContent = data.uptime || '0h';
            } catch (error) {
                console.error('Failed to update metrics:', error);
            }
        }

        async function updateCharts() {
            try {
                const mutationsResponse = await fetch('/api/mutations');
                const mutationsData = await mutationsResponse.json();

                const deploymentsResponse = await fetch('/api/deployments');
                const deploymentsData = await deploymentsResponse.json();

                // Update mutation chart
                if (mutationChart) mutationChart.destroy();
                mutationChart = new Chart(document.getElementById('mutationChart'), {
                    type: 'line',
                    data: {
                        labels: mutationsData.labels,
                        datasets: [{
                            label: 'Mutations',
                            data: mutationsData.values,
                            borderColor: '#00ff88',
                            backgroundColor: 'rgba(0, 255, 136, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                            x: { grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                        }
                    }
                });

                // Update deployment chart
                if (deploymentChart) deploymentChart.destroy();
                deploymentChart = new Chart(document.getElementById('deploymentChart'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Success', 'Failed'],
                        datasets: [{
                            data: [deploymentsData.success, deploymentsData.failed],
                            backgroundColor: ['#00ff88', '#ff4757']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            } catch (error) {
                console.error('Failed to update charts:', error);
            }
        }

        async function updateHealth() {
            try {
                const response = await fetch('/api/health');
                const health = await response.json();

                const healthDiv = document.getElementById('healthStatus');
                healthDiv.className = 'status ' + (health.status === 'healthy' ? 'healthy' : health.status === 'warning' ? 'warning' : 'error');
                healthDiv.innerHTML = '<strong>' + health.message + '</strong>';
            } catch (error) {
                console.error('Failed to update health:', error);
            }
        }

        function addRealtimeLog(message) {
            realtimeLogs.unshift({ timestamp: new Date().toLocaleTimeString(), message });
            if (realtimeLogs.length > 10) realtimeLogs.pop();

            const logsDiv = document.getElementById('realtimeLogs');
            logsDiv.innerHTML = realtimeLogs.map(log =>
                '<div class="log-entry">' + log.timestamp + ' - ' + log.message + '</div>'
            ).join('');
        }

        async function setupWebSocket() {
            try {
                const response = await fetch('/negotiate');
                const { url } = await response.json();

                const ws = new WebSocket(url);
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    addRealtimeLog(data.message);
                };
            } catch (error) {
                console.error('WebSocket setup failed:', error);
            }
        }

        // Initialize dashboard
        async function init() {
            await updateMetrics();
            await updateCharts();
            await updateHealth();
            await setupWebSocket();

            // Update every 30 seconds
            setInterval(async () => {
                await updateMetrics();
                await updateCharts();
                await updateHealth();
            }, 30000);
        }

        init();
    </script>
</body>
</html>`;
    res.send(html);
  }

  async getMetrics(req, res) {
    try {
      // Get mutation stats from Cosmos DB
      const database = this.cosmosClient.database('OmegaPrimeDB');
      const container = database.container('MutationStats');

      const querySpec = {
        query: 'SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT 1'
      };

      const { resources } = await container.items.query(querySpec).fetchAll();
      const latestStats = resources[0] || {};

      res.json({
        totalMutations: latestStats.totalMutations || 0,
        sacredMatrixMutations: latestStats.sacredMatrixMutations || 0,
        deploymentsTriggered: latestStats.deploymentsTriggered || 0,
        uptime: this.calculateUptime()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMutations(req, res) {
    try {
      const database = this.cosmosClient.database('OmegaPrimeDB');
      const container = database.container('MutationStats');

      const querySpec = {
        query: 'SELECT c.timestamp, c.totalMutations FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT 24'
      };

      const { resources } = await container.items.query(querySpec).fetchAll();

      const labels = resources.reverse().map(item => new Date(item.timestamp).toLocaleTimeString());
      const values = resources.map(item => item.totalMutations);

      res.json({ labels, values });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDeployments(req, res) {
    try {
      const database = this.cosmosClient.database('OmegaPrimeDB');
      const container = database.container('DeploymentStats');

      const querySpec = {
        query: 'SELECT c.status, COUNT(1) as count FROM c GROUP BY c.status'
      };

      const { resources } = await container.items.query(querySpec).fetchAll();

      const success = resources.find(r => r.status === 'success')?.count || 0;
      const failed = resources.find(r => r.status === 'failed')?.count || 0;

      res.json({ success, failed });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getHealth(req, res) {
    try {
      // Check Azure services health
      const healthChecks = await Promise.allSettled([
        this.checkCosmosHealth(),
        this.checkStorageHealth(),
        this.checkKeyVaultHealth(),
        this.checkMonitorHealth()
      ]);

      const failedChecks = healthChecks.filter(check => check.status === 'rejected');

      if (failedChecks.length === 0) {
        res.json({ status: 'healthy', message: '✅ All Azure services operational' });
      } else if (failedChecks.length < healthChecks.length / 2) {
        res.json({ status: 'warning', message: '⚠️ Some services experiencing issues' });
      } else {
        res.json({ status: 'error', message: '❌ Multiple services down' });
      }
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  async getRealtimeData(req, res) {
    try {
      // Get recent mutations and deployments
      const database = this.cosmosClient.database('OmegaPrimeDB');
      const mutationsContainer = database.container('MutationEvents');
      const deploymentsContainer = database.container('DeploymentEvents');

      const [mutations, deployments] = await Promise.all([
        mutationsContainer.items.query({
          query: 'SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT 5'
        }).fetchAll(),
        deploymentsContainer.items.query({
          query: 'SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT 5'
        }).fetchAll()
      ]);

      res.json({
        mutations: mutations.resources,
        deployments: deployments.resources
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async negotiateWebPubSub(req, res) {
    try {
      const token = await this.webPubSubClient.getClientAccessToken({
        userId: 'dashboard-user',
        roles: ['webpubsub.joinLeaveGroup', 'webpubsub.sendToGroup']
      });

      res.json({ url: token.url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async checkCosmosHealth() {
    await this.cosmosClient.databases.readAll().fetchAll();
  }

  async checkStorageHealth() {
    const containerClient = this.blobServiceClient.getContainerClient('health-check');
    await containerClient.getProperties();
  }

  async checkKeyVaultHealth() {
    await this.secretClient.listPropertiesOfSecrets().next();
  }

  async checkMonitorHealth() {
    await this.monitorClient.metrics.list(
      process.env.AZURE_RESOURCE_GROUP,
      'Microsoft.Web/sites',
      { metricnames: 'Requests', timespan: 'PT1H' }
    );
  }

  calculateUptime() {
    // Simple uptime calculation - in production, track actual server start time
    return '24h'; // Placeholder
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🧬 Azure MCP Dashboard running on http://localhost:${this.port}`);
    });
  }
}

// Start dashboard if called directly
if (require.main === module) {
  const dashboard = new AzureMCPDashboard();
  dashboard.start();
}

module.exports = AzureMCPDashboard;