# Docker Health Check Loop Pattern

## Problem

When starting Docker Compose services, the agent gets caught in an infinite loop trying to fix failing health checks, even when the underlying service is actually working correctly.

### Specific Instance: MinIO Health Check Loop

**Context:** Setting up Kvasir Solid Server with Docker Compose. MinIO (S3-compatible storage) was configured with a health check that required `curl`, but the MinIO container image doesn't include `curl`.

**What Happened:**
1. Agent started Docker Compose services
2. MinIO container started successfully
3. Health check failed because it tried to use `curl` which wasn't available
4. Agent detected health check failure
5. Agent tried to fix by modifying health check to use alternative tools (`wget`, `netcat`, shell-based TCP test)
6. Agent waited for health check to pass
7. Health check still failed (or took too long)
8. Agent tried another fix approach
9. **Loop repeated indefinitely**

**User Feedback:** "You keep falling into the same trap and running forever."

### Root Cause

The agent was:
- **Fixing the wrong problem**: MinIO was actually running and responding (HTTP 200 OK), but the health check was failing
- **Not recognizing when to stop**: After multiple failed attempts, should have either:
  - Disabled the health check temporarily
  - Used a simpler health check approach
  - Recognized the service was working and moved on
  - Asked the user for guidance instead of continuing to loop

## Solution

### Pattern Recognition

When encountering health check failures:

1. **First, verify the service is actually working:**
   ```bash
   # Test the service directly from host
   curl -I http://localhost:9000
   # If it responds, the service works - health check is the problem
   ```

2. **If service works but health check fails:**
   - **Option A**: Simplify the health check (use basic port check or TCP test)
   - **Option B**: Disable health check temporarily if not critical
   - **Option C**: Check if health check endpoint exists and is accessible
   - **Option D**: Ask user for guidance after 2-3 failed attempts

3. **Set a limit**: After 2-3 failed attempts to fix a health check, stop and:
   - Document what was tried
   - Explain the situation to the user
   - Ask if we should proceed without the health check or try a different approach

### Anti-Pattern: What NOT to Do

❌ **Don't keep trying different health check fixes indefinitely**
❌ **Don't assume the service is broken when only the health check fails**
❌ **Don't wait indefinitely for a health check to pass**

✅ **Do verify the service works independently of the health check**
✅ **Do set limits on retry attempts**
✅ **Do ask for user guidance when stuck**

## Prevention Strategy

1. **Always test services directly** before assuming they're broken
2. **Set explicit retry limits** (e.g., max 3 attempts)
3. **Recognize when to escalate** to user instead of continuing to loop
4. **Document attempted fixes** so we don't repeat the same approach

## Related Patterns

- Health checks are diagnostic tools, not requirements for service functionality
- Container images may not include expected tools (`curl`, `wget`, etc.)
- Health check failures don't always mean service failures
- When stuck in a loop, stop and reassess rather than continuing
