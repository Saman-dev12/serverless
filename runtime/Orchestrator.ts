import { InvocationQueue, type InvocationJob } from "./InvocationQueue";
import { executeJob } from "./scheduler";
import { WorkerPool } from "./WorkerPool";

const FUNCTION_TIMEOUT = 30000;

export class Orchestrator {
    private pool: WorkerPool;
    private queue = new InvocationQueue();
    private activeJobs = 0;

    constructor(pool: WorkerPool) {
        this.pool = pool;
        
        // When a worker becomes available, try processing queued jobs
        this.pool.setOnWorkerAvailable(() => {
            this.processQueue();
        });
    }

    public invoke(functionName: string, event: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.enqueue({
                functionName,
                event,
                resolve,
                reject,
            } as any);
            
            // Immediately try to process jobs
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        // Keep processing while there are jobs and workers available
        while (this.queue.size() > 0) {
            const worker = this.pool.getAvailableWorker();
            
            // No workers available, stop processing
            if (!worker) {
                return;
            }

            const job = this.queue.dequeue();
            if (!job) {
                return;
            }

            this.activeJobs++;

            // Process job asynchronously without blocking
            executeJob(this.pool, job.functionName, job.event, FUNCTION_TIMEOUT)
                .then((result) => {
                    job.resolve(result);
                })
                .catch((error) => {
                    job.reject(error);
                })
                .finally(() => {
                    this.activeJobs--;
                    // Process remaining queue items
                    this.processQueue();
                });
        }
    }
}