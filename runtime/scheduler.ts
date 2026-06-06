import { registry } from "./registry";
import type { WorkerInstance, WorkerPool } from "./WorkerPool";

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export async function executeJob(
    pool: WorkerPool,
    functionName: string,
    event: any,
    timeout: number = DEFAULT_TIMEOUT
): Promise<any> {
    const worker: WorkerInstance | undefined = pool.getAvailableWorker();
    if (!worker) {
        throw new Error("No workers available. Pool exhausted.");
    }

    const functionPath = registry[functionName];
    if (!functionPath) {
        throw new Error(`Function '${functionName}' not registered`);
    }

    worker.worker_state = "busy";

    return new Promise((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null;
        let messageReceived = false;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            worker.worker_state = "idle";
        };

        const messageHandler = (message: any) => {
            if (messageReceived) return; // Prevent duplicate handling

            messageReceived = true;
            worker.worker.off("message", messageHandler);
            cleanup();

            if (message.success) {
                resolve(message.result);
            } else {
                reject(new Error(message.error || "Unknown worker error"));
            }
        };

        const errorHandler = (err: Error) => {
            if (messageReceived) return;

            messageReceived = true;
            worker.worker.off("message", messageHandler);
            worker.worker.off("error", errorHandler);
            cleanup();

            reject(new Error(`Worker crashed: ${err.message}`));
        };

        timeoutId = setTimeout(() => {
            if (messageReceived) return;

            messageReceived = true;
            worker.worker.off("message", messageHandler);
            worker.worker.off("error", errorHandler);
            cleanup();

            reject(
                new Error(
                    `Function '${functionName}' exceeded timeout of ${timeout}ms`
                )
            );
        }, timeout);

        worker.worker.on("message", messageHandler);
        worker.worker.on("error", errorHandler);

        try {
            worker.worker.postMessage({ functionPath, event });
        } catch (err: any) {
            worker.worker.off("message", messageHandler);
            worker.worker.off("error", errorHandler);
            cleanup();
            reject(new Error(`Failed to send message to worker: ${err.message}`));
        }
    });
}
