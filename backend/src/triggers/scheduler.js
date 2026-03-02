import cron from 'node-cron';

// Map of workflowId -> cron task
const scheduledJobs = new Map();

/**
 * Register a scheduled trigger for a workflow.
 * @param {string} workflowId - Unique ID of the workflow
 * @param {string} cronExpression - Cron expression or interval in seconds
 * @param {Function} callback - Function to call on each tick
 */
export const registerSchedule = (workflowId, cronExpression, callback) => {
    // Stop existing job for this workflow if any
    if (scheduledJobs.has(workflowId)) {
        scheduledJobs.get(workflowId).stop();
        scheduledJobs.delete(workflowId);
        console.log(`[SCHEDULER] Stopped previous job for workflow: ${workflowId}`);
    }

    if (!cron.validate(cronExpression)) {
        console.warn(`[SCHEDULER] Invalid cron expression "${cronExpression}" for workflow ${workflowId}. Skipping.`);
        return;
    }

    const task = cron.schedule(cronExpression, () => {
        console.log(`[SCHEDULER] Firing scheduled workflow: ${workflowId}`);
        callback({ trigger: { type: 'schedule', payload: { timestamp: new Date().toISOString(), source: 'scheduler' } } });
    });

    scheduledJobs.set(workflowId, task);
    console.log(`[SCHEDULER] Registered schedule "${cronExpression}" for workflow: ${workflowId}`);
};

export const stopSchedule = (workflowId) => {
    if (scheduledJobs.has(workflowId)) {
        scheduledJobs.get(workflowId).stop();
        scheduledJobs.delete(workflowId);
        console.log(`[SCHEDULER] Stopped job for workflow: ${workflowId}`);
    }
};

export const stopAllSchedules = () => {
    scheduledJobs.forEach((task, id) => {
        task.stop();
        console.log(`[SCHEDULER] Stopped job: ${id}`);
    });
    scheduledJobs.clear();
};

/**
 * Convert seconds interval to a cron expression.
 * Supports: every N seconds, every N minutes, hourly, daily.
 */
export const intervalToCron = (seconds) => {
    const sec = parseInt(seconds);
    if (sec < 60) return `*/${sec} * * * * *`;       // every N seconds
    if (sec < 3600) return `*/${Math.floor(sec / 60)} * * * *`; // every N minutes
    if (sec < 86400) return `0 */${Math.floor(sec / 3600)} * * *`; // every N hours
    return `0 0 * * *`; // daily
};
