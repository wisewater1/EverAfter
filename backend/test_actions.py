from app.services.saint_runtime.actions.engine import action_engine

def test_action_engine():
    # Test 1: St. Joseph Calendar Event
    llm_response_1 = '''
I understand you need to remember this important dinner. I have added it to your calendar.

<ACTION>{"tool": "create_calendar_event", "kwargs": {"title": "Dinner with Mom and Dad", "date": "2026-03-05", "time": "18:00", "attendees": ["Mom", "Dad"]}}</ACTION>

Let me know if there's anything else you need coordinated!
'''
    print("--- Test 1: Calendar Event ---")
    clean_text, actions = action_engine.parse_and_execute(llm_response_1, "user_123")
    print(f"Cleaned Text: {clean_text}")
    print(f"Executed Actions: {actions}")


    # Test 2: St. Gabriel Email
    llm_response_2 = '''
**The Council Deliberates:**
* 🏛️ **Auditor**: We have been charged $15.99 unnecessarily. This is a leak we must plug immediately.
* 📈 **Strategist**: Canceling frees up Capital to be deployed in the S&P500 index fund.
* 🛡️ **Guardian**: Ensure we are not losing any important data or shared access before severing the tie.

**Gabriel's Decree**: The Council has spoken. I will sever your Netflix subscription immediately.

<ACTION>
{
  "tool": "send_email",
  "kwargs": {
    "to": "support@netflix.com",
    "subject": "Immediate Account Cancellation",
    "body": "Please cancel my account immediately and prorate any remaining balance."
  }
}
</ACTION>

Your capital is secured.
'''
    print("\n--- Test 2: Email ---")
    clean_text, actions = action_engine.parse_and_execute(llm_response_2, "user_123")
    print(f"Cleaned Text: {clean_text}")
    print(f"Executed Actions: {actions}")

if __name__ == "__main__":
    test_action_engine()
