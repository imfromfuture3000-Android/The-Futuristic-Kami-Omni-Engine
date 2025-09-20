#!/usr/bin/env node

/**
 * Automated Code Enhancement Pipeline for AI Empire
 * Continuously monitors and improves codebase using AI services
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const AIWealthServices = require('./ai-wealth-services');

class CodeEnhancementPipeline {
  constructor() {
    this.aiServices = new AIWealthServices();
    this.pipelineConfig = {
      enabled: true,
      scanInterval: 30000, // 30 seconds
      targetDirectories: ['contracts', 'scripts', 'services', 'src'],
      fileExtensions: ['.js', '.ts', '.sol', '.py', '.rs'],
      enhancementTypes: ['optimization', 'security', 'mutation'],
      maxConcurrentEnhancements: 3
    };

    this.enhancementQueue = [];
    this.activeEnhancements = 0;
    this.pipelineStats = {
      filesScanned: 0,
      enhancementsApplied: 0,
      errorsEncountered: 0,
      wealthGenerated: 0,
      lastScanTime: null
    };
  }

  async initialize() {
    console.log('🔄 Initializing Code Enhancement Pipeline...');

    await this.aiServices.initialize();
    await this.loadPipelineConfig();
    await this.loadPipelineStats();

    console.log('✅ Code Enhancement Pipeline initialized');
    console.log(`📁 Target directories: ${this.pipelineConfig.targetDirectories.join(', ')}`);
    console.log(`🔧 Enhancement types: ${this.pipelineConfig.enhancementTypes.join(', ')}`);
  }

  async start() {
    console.log('🚀 Starting Automated Code Enhancement Pipeline...');

    // Initial scan
    await this.scanAndEnhance();

    // Set up continuous monitoring
    setInterval(async () => {
      await this.scanAndEnhance();
    }, this.pipelineConfig.scanInterval);

    console.log(`⏰ Pipeline running with ${this.pipelineConfig.scanInterval/1000}s intervals`);
  }

  async scanAndEnhance() {
    try {
      console.log('🔍 Scanning codebase for enhancement opportunities...');

      const filesToProcess = await this.scanCodebase();
      this.pipelineStats.filesScanned += filesToProcess.length;
      this.pipelineStats.lastScanTime = new Date().toISOString();

      for (const file of filesToProcess) {
        if (this.activeEnhancements < this.pipelineConfig.maxConcurrentEnhancements) {
          this.enhancementQueue.push(file);
        }
      }

      // Process queued enhancements
      await this.processEnhancementQueue();

      await this.savePipelineStats();
      console.log(`✅ Scan completed. ${filesToProcess.length} files processed, ${this.enhancementQueue.length} queued`);

    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      this.pipelineStats.errorsEncountered++;
    }
  }

  async scanCodebase() {
    const filesToProcess = [];

    for (const dir of this.pipelineConfig.targetDirectories) {
      try {
        const files = await this.scanDirectory(dir);
        filesToProcess.push(...files);
      } catch (error) {
        console.warn(`⚠️  Failed to scan directory ${dir}:`, error.message);
      }
    }

    return filesToProcess;
  }

  async scanDirectory(dirPath) {
    const files = [];

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (this.pipelineConfig.fileExtensions.includes(ext)) {
            files.push({
              path: fullPath,
              name: item.name,
              extension: ext,
              lastModified: (await fs.stat(fullPath)).mtime
            });
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  async processEnhancementQueue() {
    while (this.enhancementQueue.length > 0 && this.activeEnhancements < this.pipelineConfig.maxConcurrentEnhancements) {
      const file = this.enhancementQueue.shift();
      this.activeEnhancements++;

      try {
        await this.enhanceFile(file);
        this.pipelineStats.enhancementsApplied++;
      } catch (error) {
        console.error(`❌ Failed to enhance ${file.path}:`, error.message);
        this.pipelineStats.errorsEncountered++;
      } finally {
        this.activeEnhancements--;
      }
    }
  }

  async enhanceFile(file) {
    console.log(`🔧 Enhancing ${file.path}...`);

    try {
      // Read file content
      const content = await fs.readFile(file.path, 'utf8');

      // Skip if file is too large or empty
      if (content.length > 100000 || content.length < 10) {
        return;
      }

      // Determine enhancement type based on file content and type
      const enhancementType = this.determineEnhancementType(file, content);

      let enhancementResult;

      switch (enhancementType) {
        case 'optimization':
          enhancementResult = await this.aiServices.optimizeCode(content, 'performance');
          break;
        case 'security':
          enhancementResult = await this.aiServices.performSecurityAudit(content);
          break;
        case 'mutation':
          enhancementResult = await this.aiServices.mutateCode(content, 'enhancement');
          break;
        default:
          return; // No enhancement needed
      }

      // Apply enhancement if it provides value
      if (enhancementResult && this.shouldApplyEnhancement(enhancementResult)) {
        await this.applyEnhancement(file, enhancementResult);
        this.pipelineStats.wealthGenerated += this.extractWealthValue(enhancementResult);
        console.log(`✅ Enhanced ${file.name}: ${enhancementResult.improvement || enhancementResult.qualityImprovement || 'Improved'}`);
      }

    } catch (error) {
      console.error(`❌ Enhancement failed for ${file.path}:`, error.message);
    }
  }

  determineEnhancementType(file, content) {
    // Simple heuristic-based enhancement type selection
    if (content.includes('SELECT') || content.includes('INSERT') || content.includes('UPDATE')) {
      return 'security'; // Database operations need security review
    }

    if (content.includes('for') || content.includes('while') || content.includes('function')) {
      return Math.random() > 0.5 ? 'optimization' : 'mutation'; // Code logic needs optimization or enhancement
    }

    if (content.includes('password') || content.includes('token') || content.includes('secret')) {
      return 'security'; // Security-sensitive code
    }

    return this.pipelineConfig.enhancementTypes[Math.floor(Math.random() * this.pipelineConfig.enhancementTypes.length)];
  }

  shouldApplyEnhancement(result) {
    // Determine if the enhancement provides enough value to apply
    if (result.improvement) {
      const improvementPercent = parseInt(result.improvement);
      return improvementPercent > 15; // Only apply if >15% improvement
    }

    if (result.qualityImprovement) {
      const qualityPercent = parseInt(result.qualityImprovement);
      return qualityPercent > 10; // Only apply if >10% quality improvement
    }

    if (result.vulnerabilitiesFound) {
      return result.vulnerabilitiesFound > 0; // Apply if vulnerabilities found
    }

    return false;
  }

  async applyEnhancement(file, result) {
    // Create backup
    const backupPath = `${file.path}.backup.${Date.now()}`;
    await fs.copyFile(file.path, backupPath);

    // Apply enhanced code
    const enhancedContent = result.optimizedCode || result.mutatedCode || result.originalCode;
    await fs.writeFile(file.path, enhancedContent);

    // Log the enhancement
    const logEntry = {
      timestamp: new Date().toISOString(),
      file: file.path,
      enhancementType: result.mutationType || 'optimization',
      improvement: result.improvement || result.qualityImprovement,
      wealthGenerated: result.wealthGenerated,
      backupPath
    };

    await this.logEnhancement(logEntry);
  }

  extractWealthValue(result) {
    if (result.wealthGenerated) {
      return parseInt(result.wealthGenerated.replace(/[$,]/g, ''));
    }
    return 0;
  }

  async logEnhancement(logEntry) {
    const logPath = './enhancement-pipeline-log.json';
    let logs = [];

    try {
      const existingLogs = await fs.readFile(logPath, 'utf8');
      logs = JSON.parse(existingLogs);
    } catch (error) {
      // Log file doesn't exist yet
    }

    logs.push(logEntry);
    await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
  }

  async loadPipelineConfig() {
    try {
      const configData = await fs.readFile('./enhancement-pipeline-config.json', 'utf8');
      this.pipelineConfig = { ...this.pipelineConfig, ...JSON.parse(configData) };
    } catch (error) {
      // Use default config
    }
  }

  async loadPipelineStats() {
    try {
      const statsData = await fs.readFile('./enhancement-pipeline-stats.json', 'utf8');
      this.pipelineStats = { ...this.pipelineStats, ...JSON.parse(statsData) };
    } catch (error) {
      // Use default stats
    }
  }

  async savePipelineStats() {
    await fs.writeFile('./enhancement-pipeline-stats.json', JSON.stringify(this.pipelineStats, null, 2));
  }

  async generatePipelineReport() {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.pipelineConfig,
      stats: this.pipelineStats,
      queueLength: this.enhancementQueue.length,
      activeEnhancements: this.activeEnhancements,
      recommendations: [
        'Increase scan frequency for faster improvements',
        'Add more file types for broader coverage',
        'Implement A/B testing for enhancement validation',
        'Add rollback capabilities for failed enhancements',
        'Integrate with CI/CD pipeline for automated deployment'
      ]
    };

    await fs.writeFile('./enhancement-pipeline-report.json', JSON.stringify(report, null, 2));
    console.log('📊 Enhancement pipeline report generated');

    return report;
  }

  stop() {
    console.log('🛑 Stopping Code Enhancement Pipeline...');
    // Clear any intervals if needed
  }
}

// CLI interface
if (require.main === module) {
  const pipeline = new CodeEnhancementPipeline();

  const command = process.argv[2];

  switch (command) {
    case 'start':
      pipeline.initialize().then(() => {
        pipeline.start();
        // Keep process running
        process.on('SIGINT', () => {
          pipeline.stop();
          process.exit(0);
        });
      }).catch(console.error);
      break;
    case 'scan':
      pipeline.initialize().then(() => {
        return pipeline.scanAndEnhance();
      }).then(() => {
        console.log('🔍 One-time scan completed');
      }).catch(console.error);
      break;
    case 'report':
      pipeline.initialize().then(() => {
        return pipeline.generatePipelineReport();
      }).then(report => {
        console.log('📊 Pipeline Report:');
        console.log(`📁 Files Scanned: ${report.stats.filesScanned}`);
        console.log(`🔧 Enhancements Applied: ${report.stats.enhancementsApplied}`);
        console.log(`💰 Wealth Generated: $${report.stats.wealthGenerated.toLocaleString()}`);
        console.log(`📋 Queue Length: ${report.queueLength}`);
      }).catch(console.error);
      break;
    case 'stop':
      pipeline.stop();
      break;
    default:
      console.log('Code Enhancement Pipeline CLI');
      console.log('Usage: node code-enhancement-pipeline.js <command>');
      console.log('Commands:');
      console.log('  start  - Start continuous enhancement pipeline');
      console.log('  scan   - Run one-time codebase scan and enhancement');
      console.log('  report - Generate pipeline performance report');
      console.log('  stop   - Stop the enhancement pipeline');
      break;
  }
}

module.exports = CodeEnhancementPipeline;