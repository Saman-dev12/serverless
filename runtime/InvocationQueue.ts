export interface InvocationJobInput {
    functionName: string;
    event: any;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
}

export interface InvocationJob extends InvocationJobInput {
    createdAt: number;
    timeoutAt: number;
}

export class InvocationQueue {
    private queue: InvocationJob[] = [];
    private readonly QUEUE_TIMEOUT = 60000; // 1 minute max wait in queue

    enqueue(job: InvocationJobInput): void {
        const now = Date.now();
        this.queue.push({
            ...job,
            createdAt: now,
            timeoutAt: now + this.QUEUE_TIMEOUT,
        });
    }

    dequeue(): InvocationJob | undefined {
        // Clean up timed-out jobs
        const now = Date.now();
        for (let i = this.queue.length - 1; i >= 0; i--) {
            if (now > this.queue[i]!.timeoutAt) {
                const timedOutJobs = this.queue.splice(i, 1);
                if (timedOutJobs.length > 0 && timedOutJobs[0]) {
                    timedOutJobs[0].reject(
                        new Error(
                            `Job queued for too long (${this.QUEUE_TIMEOUT}ms). Queue was saturated.`
                        )
                    );
                }
            }
        }

        return this.queue.shift();
    }

    size(): number {
        return this.queue.length;
    }
}
