import { fork, ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type WorkerStates = 
    | "idle"
    | "busy"
    | "crashed";

export interface WorkerInstance {
    worker: ChildProcess;
    worker_state: WorkerStates;
    id : string;
}

export class WorkerPool {
    private workers: WorkerInstance[] = [];
    private cleanupHandlers = new Map<ChildProcess, () => void>();
    private onWorkerAvailable: (() => void) | null = null;

    constructor(size: number = 2) {
        for (let i = 0; i < size; i++) {
            this.createWorker(i);
        }
    }

    setOnWorkerAvailable(callback: () => void): void {
        this.onWorkerAvailable = callback;
    }

    private createWorker(index:number): void {
        const worker = fork(join(__dirname, "worker.ts"));

        const errorHandler = (err: Error) => {
            console.error(`Worker error:`, err);
            this.removeWorker(worker);
        };

        const exitHandler = (code: number | null, signal: string | null) => {
            if (code !== 0) {
                console.error(`Worker exited with code ${code}, signal ${signal}`);
                this.removeWorker(worker);
            }
        };

        worker.on("error", errorHandler);
        worker.on("exit", exitHandler);

        this.workers.push({
            worker,
            worker_state:"idle",
            id: `worker-${index}`
        });

        this.cleanupHandlers.set(worker, () => {
            worker.off("error", errorHandler);
            worker.off("exit", exitHandler);
        });

        // Notify that a worker is available (for queue processing)
        if (this.onWorkerAvailable) {
            this.onWorkerAvailable();
        }
    }

    private removeWorker(worker: ChildProcess): void {
        const cleanup = this.cleanupHandlers.get(worker);
        if (cleanup) cleanup();
        this.cleanupHandlers.delete(worker);

        const index = this.workers.findIndex((w) => w.worker === worker);
        if (index !== -1) {
            this.workers.splice(index, 1);
            this.createWorker(this.workers.length);
        }
    }

    getAvailableWorker(): WorkerInstance | undefined {
        return this.workers.find((w) => w.worker_state === "idle");
    }

    async destroy(): Promise<void> {
        for (const { worker } of this.workers) {
            worker.kill();
            const cleanup = this.cleanupHandlers.get(worker);
            if (cleanup) cleanup();
        }
        this.workers = [];
        this.cleanupHandlers.clear();
    }
}