# Serverless Runtime Platform

A lightweight serverless execution platform built with Node.js that manages function execution using isolated child processes with intelligent queuing and worker pool management.

## Architecture

### Core Components

**WorkerPool** - Manages a pool of worker processes
- Creates and maintains isolated child processes
- Tracks worker states: `idle`, `busy`, `crashed`
- Automatic crash detection and recovery
- Configurable pool size (default: 4 workers)

**InvocationQueue** - Handles request queuing
- Queues jobs when all workers are busy
- Auto-rejects jobs waiting >60 seconds (queue timeout)
- FIFO processing order

**Orchestrator** - Orchestrates execution flow
- Routes jobs to available workers
- Triggers queue processing when workers become available
- Handles async job lifecycle

**Scheduler** - Executes individual jobs
- Validates function registration
- Manages job timeout (default: 30 seconds per function)
- Handles worker communication

**Worker Process** - Isolated function execution
- Separate Node.js process per worker
- Receives function path and event data
- Executes user functions with full isolation
- Communicates results back to parent

## How It Works

### Request Flow

```
POST /invoke/functionName
        ↓
Express Handler
        ↓
Orchestrator.invoke()
        ↓
Job → Enqueue
        ↓
ProcessQueue():
  ├─ Find idle worker
  ├─ If available: Execute immediately
  └─ If all busy: Wait in queue
        ↓
Scheduler.executeJob():
  ├─ Send job to worker process
  ├─ Set 30s timeout
  └─ Listen for response
        ↓
Worker Process:
  ├─ Import user function
  ├─ Execute handler(event)
  └─ Send result back
        ↓
Response
```

### Worker States

| State | Meaning |
|-------|---------|
| `idle` | Worker ready to execute jobs |
| `busy` | Worker currently executing a job |
| `crashed` | Worker process terminated unexpectedly |

### Crash Handling

```
Worker crashes
    ↓
Detected via error/exit events
    ↓
Marked as "crashed"
    ↓
Removed from pool
    ↓
Replacement worker created
    ↓
Current job rejected with error
    ↓
Other queued jobs continue
```

## API Endpoints

### Invoke Function
```bash
POST /invoke/:functionName
Content-Type: application/json

{
  "key": "value"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/invoke/sum \
  -H "Content-Type: application/json" \
  -d '{"a": 5, "b": 3}'
```

**Response (Success):**
```json
{
  "success": true,
  "result": { "result": 8 }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Function 'unknownFunc' not registered"
}
```

### Health Check
```bash
GET /health
```

Returns: `{ "status": "ok" }`

## Function Registration

Functions are registered in [runtime/registry.ts](runtime/registry.ts):

```typescript
const registry: Record<string,string> = {
    counter: path.join(__dirname,"../test_functions/counter.ts"),
    sum : path.join(__dirname,"../test_functions/sum.ts")
}
```

## Writing User Functions

Create a file in `test_functions/`:

```typescript
// test_functions/myFunction.ts
export async function handler(event: any) {
  // event contains the request body
  const { input } = event;
  
  // Validate input (user responsibility)
  if (!input) {
    throw new Error("Input parameter is required");
  }
  
  // Process
  const result = process(input);
  
  // Return result
  return { success: true, result };
}
```

Then register in `registry.ts`:
```typescript
myFunction: path.join(__dirname,"../test_functions/myFunction.ts")
```

## Key Design Decisions

### Child Processes vs Worker Threads

**Why child processes?**
- ✅ Full isolation - crashed worker doesn't affect others
- ✅ Separate memory space - no shared state issues
- ✅ Matches AWS Lambda architecture
- ✅ True process boundaries for security

**Trade-offs:**
- Slightly higher memory per worker (~30-50MB vs ~30KB)
- Slightly slower startup (~10-50ms vs ~1-2ms)
- Worth it for serverless use case

### Queueing Strategy

- **Event-driven** - not polling
- **Automatic timeout** - jobs don't wait indefinitely (60s max in queue)
- **FIFO ordering** - fair processing
- **Callback-based trigger** - `onWorkerAvailable()` when worker recovers

### Error Handling

**Three levels:**
1. **Express Layer** - Input validation, HTTP status codes
2. **Queue Layer** - Job timeout detection
3. **Worker Layer** - Crash detection, process exit handling

## Configuration

Edit constants in source files:

- **Worker pool size**: [index.ts](index.ts) - `new WorkerPool(4)`
- **Function timeout**: [index.ts](index.ts) - `FUNCTION_TIMEOUT = 30000`
- **Queue timeout**: [runtime/InvocationQueue.ts](runtime/InvocationQueue.ts) - `QUEUE_TIMEOUT = 60000`

## Performance Notes

- Pool size of 4 handles ~10-20 concurrent requests
- Each worker: ~30-50MB memory
- Max queue wait: 60 seconds
- Per-function timeout: 30 seconds
- Startup time: ~50-100ms per new worker

## Development

```bash
# Install dependencies
bun install

# Run server
bun dev

# Commit changes
git add .
git commit -m "message"

# Push to GitHub
git push origin master
```

## Future Enhancements

- [ ] Persistent queue (database-backed)
- [ ] Horizontal scaling (multiple server instances)
- [ ] Function versioning
- [ ] Execution metrics/logging
- [ ] Custom timeout per function
- [ ] Rate limiting per function
- [ ] Dead letter queue for failed jobs

## License

MIT
