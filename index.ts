import express, { type Request, type Response } from "express";
import { WorkerPool } from "./runtime/WorkerPool";
import { Orchestrator } from "./runtime/Orchestrator";

const app = express();
app.use(express.json());

const MAX_WORKERS = 4;
const workerPool = new WorkerPool(MAX_WORKERS);
const orchestrator = new Orchestrator(workerPool);

app.post("/invoke/:functionName", async (req: Request, res: Response) => {
    const functionName = req.params.functionName;

    // Validate function name
    if (typeof functionName !== "string" || !functionName.trim()) {
        return res.status(400).json({
            success: false,
            error: "Function name is required and must be a non-empty string",
        });
    }

    try {
        const result = await orchestrator.invoke(
          functionName,req.body || {}
        );
        return res.status(200).json({
            success: true,
            result,
        });
    } catch (error: any) {
        const statusCode = error.message.includes("not found")
            ? 404
            : error.message.includes("not registered")
              ? 404
              : error.message.includes("Pool exhausted")
                ? 503
                : error.message.includes("timeout")
                  ? 504
                  : 500;

        return res.status(statusCode).json({
            success: false,
            error: error.message || "Unknown server error",
        });
    }
});

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
});


app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
    });
});

const PORT = 4000;
const server = app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    server.close(async () => {
        await workerPool.destroy();
        process.exit(0);
    });
});

process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully...");
    server.close(async () => {
        await workerPool.destroy();
        process.exit(0);
    });
});