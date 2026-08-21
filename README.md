# PersonaGPT 👨‍💻

PersonaGPT is an AI-powered chat application where users can ask programming, software engineering, and career-related questions and receive answers in different developer-inspired teaching styles.

Currently, users can choose between two mentors:

- Hitesh Chaudhary-inspired teaching style
- Piyush Garg-inspired teaching style

User can select one of the two mentors to respond for each query, serving as a three way communication.

---

## ✨ Features

- 💬 ChatGPT-inspired chat interface
- 👨‍🏫 Choose between different developer-inspired mentors
- 💾 Persistent conversations using MongoDB
- 🪙 Token-based context management
- 📝 Automatic conversation summarization
- 📚 Recent messages preserved for conversational context
- ⌨️ Press `Enter` to send messages
- ↵ Use `Shift + Enter` for a new line
- 📜 Automatic scrolling to the latest message
- ⏳ Loading indicator while generating responses
- ❌ Error handling for failed API requests
- 🧹 Start a new conversation

---

## 🛠️ Tech Stack

- Next.js
- TypeScript
- React
- Tailwind CSS
- MongoDB
- Mongoose
- tiktoken
- OpenAI-compatible API

---


# 🏗️ Architecture

The application follows this flow:

```text
User
  │
  ▼
page.tsx
  │
  │ input + creator + conversationId
  ▼
POST /api/ask
  │
  ├── Validate request
  │
  ├── Connect to MongoDB
  │
  ├── Find/Create conversation
  │
  ├── Save user message
  │
  ├── Retrieve existing summary
  │
  ├── Count context tokens
  │
  ├── Summarize older messages if needed
  │
  ├── Select creator instructions
  │
  ▼
LLM API
  │
  ▼
Generate response
  │
  ├── Save assistant response
  │
  ▼
Return answer + conversationId
  │
  ▼
Update chat UI
```


# 💬 Conversation Management

Messages are stored in MongoDB as part of a conversation.

Conceptually:

```text
Conversation
│
├── _id
│
└── messages
    │
    ├── user
    │   └── "What is Redis?"
    │
    ├── assistant
    │   └── {"creator": "Hitesh", "answer": "Redis is..."}
    │
    ├── user
    │   └── "Why is it fast?"
    │
    └── assistant
        └── {"creator": "Piyush", "answer": "Because Redis stores..."}
```

When a user sends a message:

### Existing conversation

```text
User sends message
        ↓
Find conversation by conversationId
        ↓
Add user message
        ↓
Save conversation
```

### New conversation

```text
User sends first message
        ↓
Create new conversation
        ↓
Store first user message
        ↓
Generate conversationId
```

The generated `conversationId` is returned to the frontend and can be used for subsequent messages in the same conversation.

---

# 🧠 Context Management

As a conversation grows, sending the complete message history to the LLM becomes inefficient and eventually exceeds the available context budget.

PersonaGPT manages this by combining:

```text
Conversation Summary
        +
Recent Messages
```

Instead of always sending:

```text
Message 1
Message 2
Message 3
...
Message 100
```

the application can send:

```text
Summary of Messages 1–80
        +
Message 81
Message 82
...
Message 100
```

This allows the application to preserve important context while keeping the amount of text sent to the model under control.

---

## 🪙 Token-Based Context Management

The application uses `tiktoken` to estimate the number of tokens in the conversation.

```ts
const encoder = encoding_for_model("gpt-4o-mini");
```

The main configuration values are:

```ts
const RECENT_MESSAGES_BUDGET = 2500;
const CONTEXT_THRESHOLD = 7000;
```

### `CONTEXT_THRESHOLD`

When the total context exceeds:

```text
7000 tokens
```

older conversation messages may be summarized.

### `RECENT_MESSAGES_BUDGET`

The most recent messages are preserved up to approximately:

```text
2500 tokens
```

The goal is to keep recent messages available in their original form while compressing older parts of the conversation into a summary.

---

# 📝 Conversation Summarization

The application uses a separate `Summary` document for each conversation.

Conceptually:

```text
Conversation
     │
     ├── All original messages
     │
     └── Summary
           │
           ├── content
           │
           └── summarizedUntil
```

The `summarizedUntil` value acts as a boundary indicating how many messages from the conversation have already been incorporated into the summary.

For example:

```text
Conversation messages:

0  → summarized
1  → summarized
2  → summarized
3  → summarized
4  → summarized
5  → summarized
6  → recent
7  → recent
8  → recent
```

Then:

```text
summarizedUntil = 6
```

This means messages before index `6` have already been included in the stored summary.

---

## First Summary

When there is no existing summary and the conversation exceeds the context threshold:

```text
All conversation messages
          │
          ▼
Split by recent token budget
          │
          ├── Older messages
          │       ↓
          │    Summarize
          │
          └── Recent messages
                  ↓
                Keep
```

The resulting context sent to the LLM becomes:

```text
Summary of earlier conversation
            +
Recent messages
```

The summary is then stored in MongoDB.

---

## Updating an Existing Summary

When a summary already exists, only the messages that have not yet been summarized are considered.

Conceptually:

```text
Existing Summary
       +
Unsummarized Messages
       ↓
Check Token Count
```

If the context exceeds the threshold:

```text
Unsummarized Messages
       │
       ▼
Split by recent token budget
       │
       ├── Older messages
       │       ↓
       │  Merge into summary
       │
       └── Recent messages
               ↓
             Keep
```

The summary is updated and:

```text
summarizedUntil
```

is moved forward.

This prevents the application from repeatedly summarizing the same messages.

---

# 🔄 Context Management Flow

The backend handles three main cases.

## Case 1: No Existing Summary

```text
Conversation
     │
     ▼
Count tokens
     │
     ├── Under threshold
     │        ↓
     │   Send all messages
     │
     └── Over threshold
              ↓
       Summarize older messages
              +
       Keep recent messages
```

---

## Case 2: Existing Summary

```text
Existing Summary
        +
Unsummarized Messages
        │
        ▼
    Count tokens
        │
        ├── Under threshold
        │        ↓
        │ Summary + unsummarized messages
        │
        └── Over threshold
                 ↓
          Update summary
                 +
          Keep recent messages
```

---

## Case 3: Small Conversation

If the conversation has not exceeded the token threshold and no summary exists:

```text
All messages
     ↓
Send directly to the LLM
```

No summarization is performed.

---

# 🔌 API

## `POST /api/ask`

The API accepts:

```json
{
  "input": "What is Redis?",
  "creator": "hitesh",
  "conversationId": "optional-conversation-id"
}
```

For a new conversation, `conversationId` can be omitted.

Example:

```json
{
  "input": "What is Redis?",
  "creator": "hitesh"
}
```

For an existing conversation:

```json
{
  "input": "Why is it fast?",
  "creator": "hitesh",
  "conversationId": "conversation-id"
}
```

The backend returns:

```json
{
  "conversationId": "conversation-id",
  "creator": "Hitesh",
  "answer": "..."
}
```

The assistant response is then stored in the conversation.

---

# 📁 Project Structure

The exact structure may vary, but the core application is organized conceptually as follows:

```text
app/
│
├── api/
│   └── ask/
│       ├── route.ts
│       ├── creators.ts
│       │
│       ├── models/
│       │   ├── Conversation.ts
│       │   └── Summary.ts
│       │
│       └── lib/
│           └── mongoose.ts
│
├── page.tsx
├── layout.tsx
└── globals.css
```

### `page.tsx`

Handles:

* Chat interface
* User input
* Loading state
* Error state
* Message rendering
* Creator selection
* Conversation ID management

### `route.ts`

Handles:

* Request validation
* Creator validation
* Database connection
* Creating and retrieving conversations
* Saving user messages
* Token counting
* Context management
* Conversation summarization
* Updating existing summaries
* LLM requests
* Saving assistant responses

### `creators.ts`

Contains:

* Creator definitions
* Creator instructions
* `CreatorKey`
* Summarization prompt

### `Conversation`

Stores the complete conversation history.

### `Summary`

Stores:

```text
conversation
content
summarizedUntil
```

This allows the application to preserve the full conversation while maintaining a compressed representation for LLM context.

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone <your-repository-url>
cd devmentor
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create an environment file

Create a `.env.local` file in the project root:

```env
OPEN_API_KEY=your_api_key
MONGODB_URI=your_mongodb_connection_string
```

> Never commit `.env.local` or expose your API keys or database credentials.



---

## 4. Run the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🔮 Future Improvements

Some possible future improvements:

* [ ] Streaming LLM responses
* [ ] Persistent conversation sidebar
* [ ] Conversation titles
* [ ] Load previous conversations
* [ ] Delete conversations
* [ ] Edit user messages
* [ ] Regenerate assistant responses
* [ ] Markdown rendering
* [ ] Code syntax highlighting
* [ ] Authentication
* [ ] User-specific conversations
* [ ] More developer-inspired teaching styles
* [ ] Dynamic context budgets
* [ ] More accurate token accounting for prompts and message formatting
* [ ] YouTube video references
* [ ] Retrieval-Augmented Generation (RAG)
* [ ] Creator-specific knowledge retrieval  
---

---
# 👨‍💻 Author

Built by **Piyush Sharma**
---
