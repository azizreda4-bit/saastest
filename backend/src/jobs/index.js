const Queue = require('bull');
const config = require('../config');

// Job queues
const queues = {};

/**
 * Initialize job queues
 */
function initializeQueues() {
  // Order processing queue
  queues.orderProcessing = new Queue('order processing', {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: config.jobs.attempts,
      backoff: {
        type: 'exponential',
        delay: config.jobs.backoffDelay,
      },
    },
  });

  // Status update queue
  queues.statusUpdate = new Queue('status update', {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: config.jobs.attempts,
      backoff: {
        type: 'exponential',
        delay: config.jobs.backoffDelay,
      },
    },
  });

  // Notification queue
  queues.notifications = new Queue('notifications', {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: config.jobs.attempts,
      backoff: {
        type: 'exponential',
        delay: config.jobs.backoffDelay,
      },
    },
  });

  // Analytics queue
  queues.analytics = new Queue('analytics', {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    },
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 10,
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
    },
  });

  console.log('✅ Job queues initialized');
}

/**
 * Start background job processors
 */
async function startBackgroundJobs() {
  try {
    initializeQueues();

    // Order processing jobs
    queues.orderProcessing.process('create-order', config.jobs.concurrency, require('./processors/orderProcessor').createOrder);
    queues.orderProcessing.process('update-order', config.jobs.concurrency, require('./processors/orderProcessor').updateOrder);
    queues.orderProcessing.process('sync-with-provider', config.jobs.concurrency, require('./processors/orderProcessor').syncWithProvider);

    // Status update jobs
    queues.statusUpdate.process('check-status', config.jobs.concurrency, require('./processors/statusProcessor').checkStatus);
    queues.statusUpdate.process('bulk-status-check', 1, require('./processors/statusProcessor').bulkStatusCheck);

    // Notification jobs
    queues.notifications.process('send-whatsapp', config.jobs.concurrency, require('./processors/notificationProcessor').sendWhatsApp);
    queues.notifications.process('send-sms', config.jobs.concurrency, require('./processors/notificationProcessor').sendSMS);
    queues.notifications.process('send-email', config.jobs.concurrency, require('./processors/notificationProcessor').sendEmail);

    // Analytics jobs
    queues.analytics.process('update-metrics', 1, require('./processors/analyticsProcessor').updateMetrics);
    queues.analytics.process('generate-report', 1, require('./processors/analyticsProcessor').generateReport);

    // Schedule recurring jobs
    await scheduleRecurringJobs();

    console.log('✅ Background job processors started');
  } catch (error) {
    console.error('❌ Failed to start background jobs:', error);
    throw error;
  }
}

/**
 * Schedule recurring jobs
 */
async function scheduleRecurringJobs() {
  // Status check every 5 minutes
  queues.statusUpdate.add('bulk-status-check', {}, {
    repeat: { cron: '*/5 * * * *' },
    jobId: 'bulk-status-check',
  });

  // Analytics update every hour
  queues.analytics.add('update-metrics', {}, {
    repeat: { cron: '0 * * * *' },
    jobId: 'hourly-metrics',
  });

  // Daily report generation
  queues.analytics.add('generate-report', { type: 'daily' }, {
    repeat: { cron: '0 6 * * *' },
    jobId: 'daily-report',
  });

  console.log('✅ Recurring jobs scheduled');
}

/**
 * Add job to queue
 */
function addJob(queueName, jobType, data, options = {}) {
  if (!queues[queueName]) {
    throw new Error(`Queue ${queueName} not found`);
  }

  return queues[queueName].add(jobType, data, options);
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  const stats = {};

  for (const [name, queue] of Object.entries(queues)) {
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    stats[name] = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  return stats;
}

/**
 * Clean up queues
 */
async function cleanupQueues() {
  for (const queue of Object.values(queues)) {
    await queue.close();
  }
  console.log('✅ Job queues cleaned up');
}

module.exports = {
  startBackgroundJobs,
  addJob,
  getQueueStats,
  cleanupQueues,
  queues,
};