# Serverless Runtime Platform

A lightweight serverless execution platform built with Node.js. Execute functions on-demand with automatic scaling and crash recovery.

## Features

- **Isolated Execution** - Each function runs in its own process
- **Worker Pool** - Manages multiple workers for concurrent execution
- **Smart Queuing** - Automatically queues jobs when workers are busy
- **Crash Recovery** - Detects and recovers from worker failures
- **Async Processing** - Non-blocking job execution

## Quick Start

```bash
# Install dependencies
bun install

# Start the server
bun dev

# Server runs on port 3000
```

## API

### Invoke a Function

```bash
POST /invoke/:functionName
```

Example:
```bash
curl -X POST http://localhost:3000/invoke/sum \
  -H "Content-Type: application/json" \
  -d '{"a": 5, "b": 3}'
```

### Health Check

```bash
GET /health
```

## Project Structure

- `index.ts` - Main server entry point
- `runtime/` - Core runtime components
  - `WorkerPool.ts` - Worker process management
  - `Orchestrator.ts` - Job orchestration
  - `scheduler.ts` - Job execution
  - `worker.ts` - Worker process script
  - `registry.ts` - Function registry
  - `InvocationQueue.ts` - Request queue

- `test_functions/` - Example functions
  - `counter.ts` - Counter function
  - `sum.ts` - Sum function

## How It Works

1. Request comes in → routed to Orchestrator
2. Orchestrator checks for available worker
3. If available → execute immediately
4. If busy → queue the request
5. Worker becomes idle → process next queued request
6. Return result to client

## License

MIT

