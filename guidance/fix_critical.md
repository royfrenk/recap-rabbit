# Critical Change Review Guidance

> **Severity: Extremely High**

This is a **severely critical aspect** of the application. For **every file changed**, you must **thoroughly review all possible places** where that change can have an impact.

The goal is to ensure that we **do not introduce unintended changes** or **break functionality** that we do not intend to touch.

---

## Required Review Process

For **each file changed**:

- Identify **all other parts of the codebase** that interact with this file.
- Review those interactions carefully.
- Verify that **no functionality has been broken unintentionally**.

Assume that **any change can have cascading effects**.

---

## Execution Mindset

- You must **ultrathink ultrahard** while executing this plan.
- Default to skepticism: if something *might* break, assume it *will* unless proven otherwise.

---

## Phased Execution & Checkpoints

- Work is executed in **phases**.
- After completing **one phase**, you must **stop and ask for a review**.
- **Do not commit** any work from that phase until approval is explicitly given.
- Once approved, you may **commit the work for that phase**.

---

## Bottom Line

This process exists to protect the system. Speed is irrelevant; **correctness is everything**.

