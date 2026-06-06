import { parentPort } from "worker_threads";

if (!parentPort) {
    throw new Error("parentPort not available");
}

interface WorkerJob {
    functionPath: string;
    event: any;
}

parentPort.on("message", async (job: WorkerJob) => {
    const { functionPath, event } = job;
    try {
        if (!functionPath) {
            throw new Error("Function path is required");
        }

        const fn = await import(functionPath);

        if (typeof fn.handler !== "function") {
            throw new Error(`handler is not a function in ${functionPath}`);
        }

        const result = await fn.handler(event);

        parentPort!.postMessage({
            success: true,
            result,
        });
    } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        parentPort!.postMessage({
            success: false,
            error: errorMessage,
        });
    }
});

parentPort.on("error", (err) => {
    console.error("Worker error:", err);
});

parentPort.on("exit", (code) => {
    if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
    }
});