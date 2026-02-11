/**
 * Workflow Automation Service
 * Custom workflows, triggers, actions, and third-party integrations
 */

const { DataTypes, Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Initialize workflow models
 */
function initializeWorkflowModels(sequelize) {
  // Workflow Model
  const Workflow = sequelize.define('Workflow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Workflow creator'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trigger: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Trigger configuration (type, conditions)'
    },
    actions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of actions to execute'
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Workflow configuration (delays, retries, etc.)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    executionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    successCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastExecutedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  // Workflow Execution Model
  const WorkflowExecution = sequelize.define('WorkflowExecution', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    workflowId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in milliseconds'
    },
    triggerData: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Data that triggered the workflow'
    },
    executionLog: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Step-by-step execution log'
    },
    output: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Final output data'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  // Scheduled Task Model
  const ScheduledTask = sequelize.define('ScheduledTask', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    schedule: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Cron expression or predefined schedule'
    },
    taskType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type of task to execute'
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Task configuration'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastRun: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextRun: {
      type: DataTypes.DATE,
      allowNull: true
    },
    executionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });

  // Integration Model
  const Integration = sequelize.define('Integration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    provider: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g., salesforce, teams, jira, zapier'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Provider-specific configuration'
    },
    credentials: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Encrypted credentials'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'error'),
      defaultValue: 'active'
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  // Data Pipeline Model
  const DataPipeline = sequelize.define('DataPipeline', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    source: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Source configuration (type, connection)'
    },
    transformations: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of transformation steps'
    },
    destination: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Destination configuration'
    },
    schedule: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Schedule for automatic runs'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastRun: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextRun: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  // Data Pipeline Run Model
  const DataPipelineRun = sequelize.define('DataPipelineRun', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    pipelineId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recordsProcessed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    recordsFailed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    logs: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Execution logs'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  // Set up associations
  Workflow.hasMany(WorkflowExecution, { foreignKey: 'workflowId', as: 'executions' });
  WorkflowExecution.belongsTo(Workflow, { foreignKey: 'workflowId' });

  DataPipeline.hasMany(DataPipelineRun, { foreignKey: 'pipelineId', as: 'runs' });
  DataPipelineRun.belongsTo(DataPipeline, { foreignKey: 'pipelineId' });

  return {
    Workflow,
    WorkflowExecution,
    ScheduledTask,
    Integration,
    DataPipeline,
    DataPipelineRun
  };
}

/**
 * Workflow Engine Class
 */
class WorkflowEngine {
  constructor(models) {
    this.Workflow = models.Workflow;
    this.WorkflowExecution = models.WorkflowExecution;
    this.ScheduledTask = models.ScheduledTask;
    this.Integration = models.Integration;
    this.DataPipeline = models.DataPipeline;
    this.DataPipelineRun = models.DataPipelineRun;
  }

  /**
   * Create workflow
   */
  async createWorkflow(data, userId) {
    return await this.Workflow.create({
      organizationId: data.organizationId,
      userId,
      name: data.name,
      description: data.description,
      trigger: data.trigger,
      actions: data.actions || [],
      config: data.config || {}
    });
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId, triggerData = {}) {
    const workflow = await this.Workflow.findByPk(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    // Create execution record
    const execution = await this.WorkflowExecution.create({
      workflowId,
      status: 'pending',
      triggerData
    });

    try {
      // Update execution status
      await execution.update({
        status: 'running',
        startedAt: new Date()
      });

      const executionLog = [];
      const context = { ...triggerData };

      // Execute each action sequentially
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        
        const actionResult = await this.executeAction(action, context);
        
        executionLog.push({
          step: i + 1,
          action: action.type,
          timestamp: new Date(),
          status: actionResult.success ? 'success' : 'failure',
          result: actionResult.data,
          error: actionResult.error
        });

        if (!actionResult.success && workflow.config.stopOnError !== false) {
          throw new Error(`Action ${action.type} failed: ${actionResult.error}`);
        }

        // Update context with action results
        context[`action_${i}_result`] = actionResult.data;

        // Apply delay if configured
        if (action.delay) {
          await this.delay(action.delay);
        }
      }

      // Mark execution as completed
      const completedAt = new Date();
      const duration = completedAt - execution.startedAt;

      await execution.update({
        status: 'completed',
        completedAt,
        duration,
        executionLog,
        output: context
      });

      // Update workflow statistics
      await workflow.increment('successCount');
      await workflow.update({ lastExecutedAt: new Date() });

      return { success: true, execution };

    } catch (error) {
      // Mark execution as failed
      await execution.update({
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      });

      // Update workflow statistics
      await workflow.increment('failureCount');

      return { success: false, error: error.message, execution };
    } finally {
      await workflow.increment('executionCount');
    }
  }

  /**
   * Execute single action
   */
  async executeAction(action, context) {
    try {
      console.log(`[Workflow] Executing action: ${action.type}`);

      switch (action.type) {
        case 'http_request':
          return await this.executeHttpRequest(action, context);
        
        case 'send_email':
          return await this.executeSendEmail(action, context);
        
        case 'create_task':
          return await this.executeCreateTask(action, context);
        
        case 'update_record':
          return await this.executeUpdateRecord(action, context);
        
        case 'call_webhook':
          return await this.executeCallWebhook(action, context);
        
        case 'condition':
          return await this.executeCondition(action, context);
        
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute HTTP request action
   */
  async executeHttpRequest(action, context) {
    // In production, use axios or similar
    console.log(`[Workflow] HTTP ${action.method} ${action.url}`);
    
    return {
      success: true,
      data: {
        statusCode: 200,
        body: { message: 'Simulated HTTP request' }
      }
    };
  }

  /**
   * Execute send email action
   */
  async executeSendEmail(action, context) {
    console.log(`[Workflow] Sending email to ${action.to}`);
    
    return {
      success: true,
      data: { messageId: crypto.randomBytes(16).toString('hex') }
    };
  }

  /**
   * Execute create task action
   */
  async executeCreateTask(action, context) {
    console.log(`[Workflow] Creating task: ${action.title}`);
    
    return {
      success: true,
      data: { taskId: crypto.randomBytes(16).toString('hex') }
    };
  }

  /**
   * Execute update record action
   */
  async executeUpdateRecord(action, context) {
    console.log(`[Workflow] Updating record: ${action.recordType}/${action.recordId}`);
    
    return {
      success: true,
      data: { updated: true }
    };
  }

  /**
   * Execute webhook call action
   */
  async executeCallWebhook(action, context) {
    console.log(`[Workflow] Calling webhook: ${action.url}`);
    
    return {
      success: true,
      data: { delivered: true }
    };
  }

  /**
   * Execute condition action
   */
  async executeCondition(action, context) {
    // Evaluate condition (simplified)
    const result = this.evaluateCondition(action.condition, context);
    
    return {
      success: true,
      data: { conditionMet: result }
    };
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(condition, context) {
    // Simplified condition evaluation
    // In production, use a proper expression evaluator
    return true;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check workflow triggers
   */
  async checkTriggers(eventType, eventData) {
    const { literal } = require('sequelize');
    const workflows = await this.Workflow.findAll({
      where: {
        isActive: true,
        [literal(`"trigger"->>'type'`)]: eventType
      }
    });

    for (const workflow of workflows) {
      // Check if trigger conditions are met
      if (this.evaluateTriggerConditions(workflow.trigger, eventData)) {
        // Execute workflow asynchronously
        this.executeWorkflow(workflow.id, eventData).catch(err => {
          console.error('[Workflow] Execution error:', err);
        });
      }
    }
  }

  /**
   * Evaluate trigger conditions
   */
  evaluateTriggerConditions(trigger, eventData) {
    // Simplified condition evaluation
    // In production, implement proper condition matching
    return true;
  }

  /**
   * Create scheduled task
   */
  async createScheduledTask(data, userId) {
    const nextRun = this.calculateNextRun(data.schedule);
    
    return await this.ScheduledTask.create({
      organizationId: data.organizationId,
      userId,
      name: data.name,
      description: data.description,
      schedule: data.schedule,
      taskType: data.taskType,
      config: data.config || {},
      nextRun
    });
  }

  /**
   * Calculate next run time
   */
  calculateNextRun(schedule) {
    const now = new Date();
    
    // Handle predefined schedules
    switch (schedule) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      default:
        // For cron expressions, return 1 hour ahead (simplified)
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }

  /**
   * Create integration
   */
  async createIntegration(data, userId) {
    // Encrypt credentials (simplified - in production use proper encryption)
    const encryptedCredentials = Buffer.from(JSON.stringify(data.credentials)).toString('base64');
    
    return await this.Integration.create({
      organizationId: data.organizationId,
      userId,
      provider: data.provider,
      name: data.name,
      config: data.config || {},
      credentials: { encrypted: encryptedCredentials }
    });
  }

  /**
   * Get integration by provider
   */
  async getIntegration(provider, organizationId) {
    return await this.Integration.findOne({
      where: {
        provider,
        organizationId: organizationId || null,
        isActive: true
      }
    });
  }

  /**
   * Create data pipeline
   */
  async createDataPipeline(data) {
    const nextRun = data.schedule ? this.calculateNextRun(data.schedule) : null;
    
    return await this.DataPipeline.create({
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      source: data.source,
      transformations: data.transformations || [],
      destination: data.destination,
      schedule: data.schedule,
      nextRun
    });
  }

  /**
   * Execute data pipeline
   */
  async executeDataPipeline(pipelineId) {
    const pipeline = await this.DataPipeline.findByPk(pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    const run = await this.DataPipelineRun.create({
      pipelineId,
      status: 'pending'
    });

    try {
      await run.update({
        status: 'running',
        startedAt: new Date()
      });

      const logs = [];

      // Step 1: Extract data from source
      logs.push({ step: 'extract', timestamp: new Date(), message: 'Extracting data from source' });
      const sourceData = await this.extractData(pipeline.source);
      
      // Step 2: Apply transformations
      logs.push({ step: 'transform', timestamp: new Date(), message: 'Applying transformations' });
      let transformedData = sourceData;
      for (const transformation of pipeline.transformations) {
        transformedData = await this.applyTransformation(transformation, transformedData);
      }
      
      // Step 3: Load data to destination
      logs.push({ step: 'load', timestamp: new Date(), message: 'Loading data to destination' });
      await this.loadData(pipeline.destination, transformedData);

      await run.update({
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: transformedData.length,
        logs
      });

      // Update pipeline
      await pipeline.update({
        lastRun: new Date(),
        nextRun: pipeline.schedule ? this.calculateNextRun(pipeline.schedule) : null
      });

      return { success: true, run };

    } catch (error) {
      await run.update({
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      });

      return { success: false, error: error.message, run };
    }
  }

  /**
   * Extract data from source
   */
  async extractData(source) {
    console.log(`[Pipeline] Extracting data from ${source.type}`);
    
    // In production, implement actual data extraction
    // For now, return mock data
    return [
      { id: 1, name: 'Record 1' },
      { id: 2, name: 'Record 2' }
    ];
  }

  /**
   * Apply transformation
   */
  async applyTransformation(transformation, data) {
    console.log(`[Pipeline] Applying transformation: ${transformation.type}`);
    
    // In production, implement actual transformations
    // For now, return data as-is
    return data;
  }

  /**
   * Load data to destination
   */
  async loadData(destination, data) {
    console.log(`[Pipeline] Loading ${data.length} records to ${destination.type}`);
    
    // In production, implement actual data loading
    return true;
  }
}

module.exports = {
  initializeWorkflowModels,
  WorkflowEngine
};
