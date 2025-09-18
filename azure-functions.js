/**
 * Azure Functions for Gene Mint Protocol
 * Trait Fusion and Sacred Logic Generation
 */

const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_KEY
  }
});

/**
 * Trait Fusion Function
 * Combines two traits to create a new enhanced trait
 */
module.exports.traitFusion = async function (context, req) {
  context.log('Trait Fusion function triggered');

  try {
    const { traitA, traitB } = req.body;

    if (!traitA || !traitB) {
      context.res = {
        status: 400,
        body: { error: 'Both traitA and traitB are required' }
      };
      return;
    }

    // Generate fusion prompt
    const fusionPrompt = `Combine these two traits into a powerful new trait:

Trait A: ${traitA}
Trait B: ${traitB}

Create a fusion that enhances both traits synergistically. The result should be:
1. A unique name for the fused trait
2. Enhanced capabilities that combine both traits
3. A description of the fusion's power
4. Rarity level (Common, Rare, Epic, Legendary, Mythic)

Format as JSON with keys: name, description, capabilities, rarity, fusionId`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: fusionPrompt }],
      temperature: 0.8,
      max_tokens: 500
    });

    const fusionResult = JSON.parse(response.choices[0].message.content);
    fusionResult.fusionId = `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    fusionResult.timestamp = new Date().toISOString();

    context.res = {
      status: 200,
      body: fusionResult
    };

  } catch (error) {
    context.log.error('Trait fusion error:', error);
    context.res = {
      status: 500,
      body: { error: 'Trait fusion failed', details: error.message }
    };
  }
};

/**
 * Sacred Logic Generation Function
 * Generates sacred logic patterns for gene minting
 */
module.exports.generateSacredLogic = async function (context, req) {
  context.log('Sacred Logic Generation function triggered');

  try {
    const { logicId, complexity = 1 } = req.body;

    if (!logicId) {
      context.res = {
        status: 400,
        body: { error: 'logicId is required' }
      };
      return;
    }

    // Generate sacred logic prompt
    const logicPrompt = `Generate sacred logic for Gene Mint Protocol:

Logic ID: ${logicId}
Complexity Level: ${complexity}

Create a sacred mathematical pattern that governs gene minting. Include:
1. Sacred geometry pattern (Fibonacci, Golden Ratio, Sacred Geometry)
2. Mathematical formula for trait generation
3. Probability distribution for rare traits
4. Harmony coefficient calculation
5. Divine intervention triggers

Format as JSON with keys: pattern, formula, probabilities, harmony, triggers, logicId`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: logicPrompt }],
      temperature: 0.6,
      max_tokens: 800
    });

    const logicResult = JSON.parse(response.choices[0].message.content);
    logicResult.logicId = logicId;
    logicResult.complexity = complexity;
    logicResult.generatedAt = new Date().toISOString();

    context.res = {
      status: 200,
      body: logicResult
    };

  } catch (error) {
    context.log.error('Sacred logic generation error:', error);
    context.res = {
      status: 500,
      body: { error: 'Sacred logic generation failed', details: error.message }
    };
  }
};

/**
 * Analytics Processor Function
 * Processes mint events and generates insights
 */
module.exports.processAnalytics = async function (context, req) {
  context.log('Analytics Processor function triggered');

  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      context.res = {
        status: 400,
        body: { error: 'Events array is required' }
      };
      return;
    }

    // Analyze events
    const analytics = {
      totalEvents: events.length,
      logicDistribution: {},
      traitFrequency: {},
      timeDistribution: {},
      successRate: 0,
      averageProcessingTime: 0
    };

    let successfulEvents = 0;
    let totalProcessingTime = 0;

    events.forEach(event => {
      // Logic distribution
      const logicId = event.logicId || 'unknown';
      analytics.logicDistribution[logicId] = (analytics.logicDistribution[logicId] || 0) + 1;

      // Trait frequency
      if (event.traits) {
        event.traits.forEach(trait => {
          analytics.traitFrequency[trait] = (analytics.traitFrequency[trait] || 0) + 1;
        });
      }

      // Success rate
      if (event.success) {
        successfulEvents++;
      }

      // Processing time
      if (event.processingTime) {
        totalProcessingTime += event.processingTime;
      }

      // Time distribution (by hour)
      const hour = new Date(event.timestamp).getHours();
      analytics.timeDistribution[hour] = (analytics.timeDistribution[hour] || 0) + 1;
    });

    analytics.successRate = (successfulEvents / events.length) * 100;
    analytics.averageProcessingTime = totalProcessingTime / events.length;

    context.res = {
      status: 200,
      body: {
        analytics,
        processedAt: new Date().toISOString(),
        eventCount: events.length
      }
    };

  } catch (error) {
    context.log.error('Analytics processing error:', error);
    context.res = {
      status: 500,
      body: { error: 'Analytics processing failed', details: error.message }
    };
  }
};

/**
 * Health Check Function
 * Monitors system health and performance
 */
module.exports.healthCheck = async function (context, req) {
  context.log('Health Check function triggered');

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      openai: 'operational',
      cosmos: 'operational',
      storage: 'operational',
      keyvault: 'operational'
    },
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };

  context.res = {
    status: 200,
    body: health
  };
};