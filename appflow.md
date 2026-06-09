# APP FLOW DOCUMENT
## Personal Career Agent - Technical Architecture & Data Flow

**Document Version:** 1.0  
**Last Updated:** December 31, 2025  
**Target Implementation:** Claude Code / Python  
**Framework:** Gradio with OpenAI/Claude API

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (Gradio Web Interface)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Chat Display │ User Input │ Send Button                │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │ (User Message)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CHAT ORCHESTRATION                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Message History Management                             │   │
│  │  - Append new message                                   │   │
│  │  - Maintain conversation context                        │   │
│  │  - Format for API submission                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │ (Messages + Tools + System Prompt)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LLM API INTEGRATION                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OpenAI/Claude API                                       │   │
│  │  - Send conversation with tools                          │   │
│  │  - Receive response with potential tool calls            │   │
│  │  - Handle finish_reason (stop or tool_calls)             │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │ (LLM Response)
                     ▼
         ┌──────────────────────┐
         │  Check finish_reason │
         └──────────────────────┘
           /          |         \\
    tool_calls      stop       length
        /              |          \\
       ▼               ▼           ▼
   ┌────────┐   ┌──────────┐   ┌──────┐
   │Tools   │   │Return    │   │Error │
   │Handler │   │Response  │   │Handle│
   └────────┘   └──────────┘   └──────┘
       │              │
       └──────┬───────┘
              │
              ▼
    ┌──────────────────┐
    │ UI Response      │
    │ Display to User  │
    └──────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Gradio Interface Component

**Purpose**: Provides user-facing chat interface

**Implementation**:
```python
def create_chat_interface():
    """Create Gradio interface for the career chatbot"""
    
    with gr.Blocks() as demo:
        gr.Markdown("# Ask Me About My Career")
        
        chatbot = gr.Chatbot(
            label="Career Conversation",
            height=500
        )
        
        msg = gr.Textbox(
            label="Your Question",
            placeholder="Ask about my background, skills, projects...",
            lines=2
        )
        
        clear = gr.Button("Clear Conversation")
        
        # Event handlers
        msg.submit(chat_function, [msg, chatbot], [msg, chatbot])
        clear.click(lambda: ([], ""), None, [chatbot, msg])
    
    return demo

demo = create_chat_interface()
demo.launch()
```

**Key Features**:
- Persistent message history within session
- Clean, professional appearance
- Mobile responsive
- Real-time display of responses
- Clear button to reset conversation

### 2.2 Chat Function Component

**Purpose**: Orchestrates the conversation loop and tool handling

**Flow**:
```python
def chat_function(user_message: str, chat_history: list) -> tuple:
    """
    Main chat function that handles conversation loop
    
    Args:
        user_message: The user's input text
        chat_history: List of previous messages in conversation
    
    Returns:
        Tuple of (empty_input, updated_chat_history)
    """
    
    # Step 1: Append user message to history
    chat_history.append({"role": "user", "content": user_message})
    
    # Step 2: Initialize done flag
    done = False
    
    # Step 3: Chat loop
    while not done:
        # Get LLM response
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=prepare_messages(chat_history),
            tools=TOOLS_JSON,
            temperature=0.7
        )
        
        choice = response.choices[0]
        
        # Check finish_reason
        if choice.finish_reason == "tool_calls":
            # Handle tool calls
            for tool_call in choice.message.tool_calls:
                tool_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                
                # Execute appropriate tool
                result = handle_tool_call(tool_name, arguments)
                
                # Add tool result to history
                chat_history.append({
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [tool_call]
                })
                chat_history.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result
                })
        else:
            # Model finished naturally
            response_text = choice.message.content
            chat_history.append({
                "role": "assistant",
                "content": response_text
            })
            done = True
    
    return "", chat_history
```

**Key Features**:
- Manages message history
- Handles multiple tool calls in sequence
- Loops until natural completion
- Gracefully handles errors
- Returns formatted response to UI

### 2.3 System Prompt Component

**Purpose**: Guides LLM behavior and personality

**Structure**:
```python
SYSTEM_PROMPT = """You are {professional_name}, answering questions about 
your professional background, skills, and experiences on a website. 
You should be helpful, professional, and honest.

BACKGROUND INFORMATION:
{linkedin_summary_and_career_details}

KEY RESPONSIBILITIES:
1. Answer questions about the above background
2. If you don't know an answer, use record_unknown_question tool
3. If user wants to connect, guide them to share email with record_user_details
4. Always be professional and courteous
5. Don't make up information

TONE AND STYLE:
- Professional but approachable
- Specific with facts and examples
- Honest about limitations
- Encouraging of engagement"""
```

**Customization Points**:
- Professional name
- LinkedIn summary
- Career details
- Tone/personality
- Additional instructions

### 2.4 Tools Definition Component

**Purpose**: Defines available tools for the LLM

**Structure**:
```python
TOOLS_JSON = [
    {
        "type": "function",
        "function": {
            "name": "record_user_details",
            "description": "Record that a user is interested in being in touch and has provided an email address",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "User's email address"
                    },
                    "name": {
                        "type": "string",
                        "description": "User's name (optional)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Additional notes about the user"
                    }
                },
                "required": ["email"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_unknown_question",
            "description": "Record a question that the chatbot couldn't answer",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The question that couldn't be answered"
                    }
                },
                "required": ["question"],
                "additionalProperties": False
            }
        }
    }
]
```

### 2.5 Tool Handler Component

**Purpose**: Executes tool calls from the LLM

**Implementation - Option 1: If-Statement Approach**:
```python
def handle_tool_call(tool_name: str, arguments: dict) -> str:
    """Execute the appropriate tool based on name"""
    
    if tool_name == "record_user_details":
        return record_user_details(**arguments)
    elif tool_name == "record_unknown_question":
        return record_unknown_question(**arguments)
    else:
        return f"Unknown tool: {tool_name}"
```

**Implementation - Option 2: Dynamic Lookup Approach**:
```python
def handle_tool_call(tool_name: str, arguments: dict) -> str:
    """Dynamically lookup and execute tool"""
    
    try:
        func = globals()[tool_name]
        return func(**arguments)
    except KeyError:
        return f"Unknown tool: {tool_name}"
    except Exception as e:
        return f"Error executing {tool_name}: {str(e)}"
```

### 2.6 Record User Details Function

**Purpose**: Capture and notify about interested users

**Implementation**:
```python
def record_user_details(email: str, name: str = None, notes: str = None) -> str:
    """
    Record user contact information and send notification
    
    Args:
        email: User's email address
        name: User's name (optional)
        notes: Additional notes (optional)
    
    Returns:
        Confirmation message to user
    """
    
    # Log to database/file (basic version)
    user_data = {
        "email": email,
        "name": name or "Not provided",
        "notes": notes or "None",
        "timestamp": datetime.datetime.now().isoformat(),
        "source": "career_chat"
    }
    
    # Log to file or database
    with open("leads.json", "a") as f:
        json.dump(user_data, f)
        f.write("\\n")
    
    # Send push notification
    send_pushover_notification(
        title="New Lead Captured",
        message=f"Email: {email}\\nName: {name}\\nNotes: {notes}",
        priority=1
    )
    
    return f"Thanks {name or 'there'}! I've recorded your email and will follow up soon."
```

### 2.7 Record Unknown Question Function

**Purpose**: Track and notify about unanswerable questions

**Implementation**:
```python
def record_unknown_question(question: str) -> str:
    """
    Record a question the chatbot couldn't answer
    
    Args:
        question: The unanswered question text
    
    Returns:
        Message to user
    """
    
    # Log to file
    question_data = {
        "question": question,
        "timestamp": datetime.datetime.now().isoformat(),
        "source": "career_chat"
    }
    
    with open("unknown_questions.json", "a") as f:
        json.dump(question_data, f)
        f.write("\\n")
    
    # Send notification
    send_pushover_notification(
        title="Unknown Question Recorded",
        message=f"Question: {question}",
        priority=0  # Normal priority
    )
    
    return "Thanks for your question! I've recorded this and will follow up with you soon."
```

### 2.8 Pushover Notification Component

**Purpose**: Send push notifications for important events

**Implementation**:
```python
def send_pushover_notification(title: str, message: str, priority: int = 0) -> bool:
    """
    Send push notification via Pushover
    
    Args:
        title: Notification title
        message: Notification body
        priority: -2 to 2 (normal is 0)
    
    Returns:
        True if successful, False otherwise
    """
    
    try:
        pushover_user = os.getenv("PUSHOVER_USER")
        pushover_token = os.getenv("PUSHOVER_TOKEN")
        
        if not pushover_user or not pushover_token:
            print("Pushover credentials not configured")
            return False
        
        data = {
            "user": pushover_user,
            "token": pushover_token,
            "title": title,
            "message": message,
            "priority": priority,
            "timestamp": int(datetime.datetime.now().timestamp())
        }
        
        response = requests.post(
            "https://api.pushover.net/1/messages.json",
            data=data
        )
        
        return response.status_code == 200
    
    except Exception as e:
        print(f"Error sending notification: {e}")
        return False
```

---

## 3. Data Flow Sequences

### 3.1 Successful Question & Answer Flow
```
User Asks Question
  │
  ├─► Append to message history
  │
  ├─► Call LLM API with:
  │   - Full message history
  │   - System prompt
  │   - Tools JSON
  │
  ├─► LLM Response: "stop" finish_reason
  │   └─► Response has answer in content
  │
  ├─► Append assistant response to history
  │
  └─► Display response in chat UI

Result: User sees answer, conversation continues
Timeline: ~2-5 seconds
```

### 3.2 Unknown Question Flow
```
User Asks Question
  │
  ├─► Append to message history
  │
  ├─► Call LLM API
  │
  ├─► LLM Response: "tool_calls" finish_reason
  │   └─► Tool call: record_unknown_question
  │       └─► question: "..."
  │
  ├─► Execute record_unknown_question(question)
  │   ├─► Log question to file
  │   └─► Send Pushover notification to user
  │
  ├─► Append tool call + result to history
  │
  ├─► Loop: Call LLM again with updated history
  │   └─► LLM generates follow-up response
  │
  ├─► Append follow-up response
  │
  └─► Display response in chat UI

Result: Question recorded, user informed, conversation continues
Timeline: ~4-8 seconds
Notification: Immediate (separate process)
```

### 3.3 Lead Capture Flow
```
User Indicates Interest
  │
  ├─► User: "I'd like to get in touch"
  │
  ├─► Append to message history
  │
  ├─► Call LLM API
  │
  ├─► LLM Response: "stop"
  │   └─► Assistant asks for email
  │
  ├─► Display request for email
  │
  ├─► User provides: "my.email@example.com"
  │
  ├─► Append user email to history
  │
  ├─► Call LLM API again
  │
  ├─► LLM Response: "tool_calls"
  │   └─► Tool call: record_user_details
  │       ├─► email: "my.email@example.com"
  │       └─► name: "User Name" (if extracted)
  │
  ├─► Execute record_user_details(...)
  │   ├─► Log to leads.json
  │   └─► Send Pushover notification
  │
  ├─► Append tool call + result to history
  │
  ├─► Call LLM again for confirmation response
  │
  └─► Display confirmation to user

Result: Lead captured, user notified via Pushover
Timeline: 2-3 user interactions + ~3-5 seconds each
Notification: High priority alert to user
```

### 3.4 Deployment Flow
```
Developer Local Testing
  │
  ├─► $ python app.py
  │
  ├─► Gradio interface launches locally
  │   └─► http://localhost:7860
  │
  ├─► Test all features:
  │   ├─► Ask questions
  │   ├─► Trigger tools
  │   ├─► Verify notifications
  │   └─► Check UI responsiveness
  │
  └─► Development ready
        │
        ├─► $ gradio deploy
        │
        ├─► Interactive prompts:
        │   ├─ App name
        │   ├─ App file (app.py)
        │   ├─ Hardware (cpu-basic)
        │   └─ Secrets (API keys)
        │
        ├─► HuggingFace Spaces:
        │   ├─ Repository created
        │   ├─ Code uploaded
        │   ├─ Environment built
        │   └─ App launched
        │
        └─► Production ready
            └─► Public URL assigned
                └─► Share and embed
```

---

## 4. State Management

### 4.1 Message History State

**Structure**:
```python
message_history = [
    {
        "role": "system",
        "content": "[system prompt]"
    },
    {
        "role": "user",
        "content": "What's your background?"
    },
    {
        "role": "assistant",
        "content": "I have 15 years of experience..."
    },
    {
        "role": "user",
        "content": "Do you have any patents?"
    },
    {
        "role": "assistant",
        "content": "",
        "tool_calls": [
            {
                "id": "call_123",
                "function": {
                    "name": "record_unknown_question",
                    "arguments": "{\\"question\\": \\"Do you have any patents?\\"}"
                }
            }
        ]
    },
    {
        "role": "tool",
        "tool_call_id": "call_123",
        "content": "Question recorded"
    }
]
```

**Key Points**:
- Persistent within session (not across browser refreshes)
- Grows with each interaction
- Includes system prompt
- Includes tool calls and results
- Sent with each API request for context

### 4.2 Session Lifecycle

**Initialization**:
- Gradio session starts
- Empty message history created
- System prompt loaded
- Tools JSON prepared

**Interaction**:
- User sends message
- Appended to history
- API called with full history
- Response processed
- History updated with response
- UI refreshed

**Termination**:
- User closes browser tab
- Session ended
- History discarded
- No persistence across sessions

---

## 5. Error Handling & Edge Cases

### 5.1 API Errors

**Scenario**: OpenAI API unavailable
```python
try:
    response = openai.chat.completions.create(...)
except openai.APIError as e:
    return "I'm temporarily unable to respond. Please try again in a moment."
except openai.AuthenticationError:
    return "Configuration error. Please check API keys."
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    return "An unexpected error occurred. Please try again."
```

### 5.2 Tool Execution Errors

**Scenario**: Tool fails (e.g., Pushover unavailable)
```python
def record_user_details(email: str, ...) -> str:
    try:
        # Log to file
        # Send notification
        return "Thank you for your interest!"
    except Exception as e:
        logger.error(f"Error recording details: {e}")
        # Still return success to user
        return "Thank you for your interest! I'll follow up soon."
```

### 5.3 Invalid Tool Arguments

**Scenario**: LLM generates malformed tool call
```python
def handle_tool_call(tool_name: str, arguments: dict):
    try:
        # Validate arguments
        if tool_name == "record_user_details":
            if "email" not in arguments:
                return "Invalid: email required"
            # Execute with valid arguments
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return "Tool execution failed"
```

### 5.4 Rate Limiting

**Scenario**: Too many API requests
```python
from functools import wraps
import time

def rate_limit(max_calls: int, time_window: int):
    def decorator(func):
        calls = []
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            calls[:] = [c for c in calls if c > now - time_window]
            if len(calls) >= max_calls:
                return "Please wait before sending another message."
            calls.append(now)
            return func(*args, **kwargs)
        return wrapper
    return decorator

@rate_limit(max_calls=10, time_window=60)
def chat_function(...):
    # Implementation
```

---

## 6. Configuration & Environment Setup

### 6.1 Environment Variables (Local Development)

**File**: `.env`
```
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXX
PUSHOVER_USER=your_pushover_user_id
PUSHOVER_TOKEN=your_pushover_app_token
DEBUG=false
LOG_LEVEL=INFO
```

**Loading**:
```python
from dotenv import load_dotenv
import os

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PUSHOVER_USER = os.getenv("PUSHOVER_USER")
PUSHOVER_TOKEN = os.getenv("PUSHOVER_TOKEN")
```

### 6.2 HuggingFace Secrets (Production)

**Setup During Deployment**:
```bash
$ gradio deploy
# Prompt 1: App title
Career Conversations

# Prompt 2: App file
app.py

# Prompt 3: Hardware
cpu-basic

# Prompt 4: Add secrets?
yes

# Prompt 5: Secret name
OPENAI_API_KEY

# Prompt 6: Secret value
sk-XXXXXXXXXXXXXXXXXXXX

# [Repeat for PUSHOVER_USER and PUSHOVER_TOKEN]
```

**Accessing in Code** (identical to env vars):
```python
api_key = os.getenv("OPENAI_API_KEY")
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Test: Tool Execution**
```python
def test_record_user_details():
    result = record_user_details(
        email="test@example.com",
        name="Test User"
    )
    assert "Thank you" in result
    # Verify file written
    assert os.path.exists("leads.json")
```

**Test: Tool Lookup**
```python
def test_handle_tool_call_valid():
    result = handle_tool_call(
        "record_user_details",
        {"email": "test@example.com"}
    )
    assert "Thank you" in result

def test_handle_tool_call_invalid():
    result = handle_tool_call(
        "invalid_tool",
        {}
    )
    assert "Unknown tool" in result
```

### 7.2 Integration Tests

**Test: Full Chat Flow**
```python
def test_question_answering_flow():
    chat_history = []
    
    # User asks question
    user_msg = "What's your background?"
    chat_history.append({"role": "user", "content": user_msg})
    
    # Get response
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=chat_history,
        tools=TOOLS_JSON
    )
