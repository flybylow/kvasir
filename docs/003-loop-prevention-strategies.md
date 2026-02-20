# Loop Prevention Strategies

## Problem

Agents can get caught in repetitive loops when:
- Trying to fix a problem that doesn't actually exist
- Not recognizing when a different approach is needed
- Not setting limits on retry attempts
- Not verifying assumptions before acting

## Solution: Loop Prevention Checklist

### Before Starting Any Fix Loop

1. **Verify the actual problem exists**
   - Test the service/component directly
   - Don't assume failure based on diagnostic tools alone
   - Check if the "problem" is actually blocking progress

2. **Set explicit retry limits**
   - Maximum 2-3 attempts for the same approach
   - After limit reached, stop and reassess
   - Document what was tried before moving to next approach

3. **Verify assumptions**
   - Is the service actually broken, or just the health check?
   - Are the tools available that we're trying to use?
   - Is the error message accurate?

4. **Know when to escalate**
   - After 2-3 failed attempts, ask user for guidance
   - Explain what was tried and what the actual state is
   - Don't continue looping silently

### During Problem Solving

1. **Test independently**
   - Don't rely solely on health checks or status indicators
   - Test the actual functionality directly
   - Verify from multiple angles

2. **Document attempts**
   - Keep track of what was tried
   - Note what worked and what didn't
   - This prevents repeating the same failed approach

3. **Recognize patterns**
   - If we've tried similar fixes before, reference previous attempts
   - Check documentation for similar problems
   - Learn from past mistakes

### When Stuck

1. **Stop the loop**
   - Explicitly stop trying the same approach
   - Acknowledge that current approach isn't working

2. **Reassess**
   - What is the actual goal?
   - What is actually broken vs. what appears broken?
   - Is there a simpler approach?

3. **Communicate**
   - Explain the situation to the user
   - Ask for guidance or permission to try a different approach
   - Be transparent about what was attempted

## Examples

### ✅ Good Pattern
```
1. Detect health check failure
2. Test service directly → Service works!
3. Identify health check as the issue
4. Try 1-2 simple fixes
5. If still failing, disable health check or ask user
6. Move on to next step
```

### ❌ Bad Pattern (Loop)
```
1. Detect health check failure
2. Try fix A → fails
3. Try fix B → fails  
4. Try fix C → fails
5. Try fix A again → fails
6. Keep trying indefinitely...
```

## Implementation

When writing code or fixing issues:

1. **Add retry limits** to any retry logic
2. **Verify independently** before assuming failure
3. **Check documentation** before trying fixes
4. **Ask for help** after reasonable attempts
5. **Document solutions** for future reference

## Rule #1: Always Keep the Wood Clean

This means:
- Don't let problems accumulate
- Fix issues properly the first time
- Document solutions so we don't repeat mistakes
- Recognize when we're stuck and need to change approach
