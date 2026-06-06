interface WorkerJob {
    functionPath: string;
    event: any;
}

// Listen for messages from parent process
process.on("message", async (job: WorkerJob) => {
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

        // Send result back to parent
        process.send!({
            success: true,
            result,
        });
    } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        process.send!({
            success: false,
            error: errorMessage,
        });
    }
});

process.on("error", (err) => {
    console.error("Worker error:", err);
});

process.on("exit", (code) => {
    if (code !== 0) {
        console.error(`Worker process exited with code ${code}`);
    }
});