import { describe, it, expect, vi, beforeEach } from "vitest";
import { withIdempotency, _resetIdempotencyStore, DuplicateRequestError } from "@/lib/idempotency";

describe("Milestone 38 — Server-Side Idempotency Protection", () => {
  beforeEach(() => {
    _resetIdempotencyStore();
  });

  it("executes action exactly once when multiple identical concurrent requests arrive", async () => {
    const mockWorker = vi.fn().mockImplementation(async () => {
      // Simulate 50ms async DB write or PDF generation queueing
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { jobId: "job_998877", status: "queued", recordsCount: 1 };
    });

    const idempotencyKey = "req_report_card_class_101_term_1";

    // Simulate 3 rapid clicks / concurrent network retries
    const promise1 = withIdempotency(idempotencyKey, () => mockWorker());
    const promise2 = withIdempotency(idempotencyKey, () => mockWorker()).catch(
      (err) => err
    );
    const promise3 = withIdempotency(idempotencyKey, () => mockWorker()).catch(
      (err) => err
    );

    const [res1, res2, res3] = await Promise.all([promise1, promise2, promise3]);

    // Primary request succeeds
    expect(res1).toEqual({ jobId: "job_998877", status: "queued", recordsCount: 1 });

    // Concurrent in-flight duplicates are blocked with DuplicateRequestError
    expect(res2).toBeInstanceOf(DuplicateRequestError);
    expect(res3).toBeInstanceOf(DuplicateRequestError);

    // The underlying high-stakes worker function was invoked EXACTLY 1 time
    expect(mockWorker).toHaveBeenCalledTimes(1);
  });

  it("returns cached completed result on subsequent duplicate requests after completion", async () => {
    let callCount = 0;
    const paymentAction = async () => {
      callCount++;
      return { transactionRef: "PAY_12345", amountPaid: 50000, status: "settled" };
    };

    const key = "paystack_order_tx_5544";

    // First request
    const firstResult = await withIdempotency(key, paymentAction);
    expect(firstResult.status).toBe("settled");
    expect(callCount).toBe(1);

    // Subsequent request with same idempotency key returns completed result without double-charging
    const secondResult = await withIdempotency(key, paymentAction);
    expect(secondResult.status).toBe("settled");
    expect(callCount).toBe(1); // STILL 1
  });

  it("re-enables retry if initial attempt fails with an error", async () => {
    let callCount = 0;
    const unstableService = async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Temporary network timeout");
      }
      return { success: true };
    };

    const key = "promotion_class_ss1_2026";

    // First attempt fails
    await expect(withIdempotency(key, unstableService)).rejects.toThrow(
      "Temporary network timeout"
    );

    // Key is cleared, allowing user retry
    const retryResult = await withIdempotency(key, unstableService);
    expect(retryResult.success).toBe(true);
    expect(callCount).toBe(2);
  });
});
