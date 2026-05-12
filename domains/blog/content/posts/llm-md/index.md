---
title: Why AI Agents Speak Markdown (But Think in JSON)
date: '2025-11-29'
author: Rohit Radhakrishnan
excerpt: >-
  AI coding tools love Markdown, but that's just a mask. Discover the 'Dual
  Brain' architecture where agents speak to you in readable text but strictly
  think in JSON code to get the job done.
category: AI
tags:
  - LLM
  - Context Engineering
  - AI Agent
  - Markdown
featuredImage: feature-image.png
status: published
---
If you code with AI tools like Cursor or ChatGPT, you've noticed something. They love Markdown.

Ask for a fix? You get a code block. Ask for a summary? You get bullet points. Even complex charts come as text.

It looks like a style choice, but it's practical. We are seeing a split in how AI works: the interface you see versus how the model actually thinks.

Here is why agents speak Markdown but think in JSON.

## Part 1: Why the AI "Speaks" Markdown

Markdown isn't just for looks. For engineers, it solves three big problems: training data, speed, and parsing.

### 1. It learns from GitHub

Models learn from what they read. Coding agents read GitHub. The standard there is README.md. So, when you ask a tech question, the model naturally answers in Markdown.

### 2. It doesn't break easily

AI writes one word at a time. If it tries to write complex HTML and stops in the middle, the page breaks. An unclosed tag ruins the layout. Markdown is safer. If the AI stops halfway through a list, you can still read the text.

### 3. The "Apply" button needs it

Tools like Cursor have an "Apply" button to add code to your file. The system needs to know exactly where the code is. Markdown's backticks (`) act as markers. Without them, the tool can't tell the difference between chat and code.

## Part 2: The "Dual Brain"

Markdown is good for us, but bad for machines.

Back in 2023, we asked models to write things like `Action: CALC`. It was messy. If the model added an extra space or a colon, the script failed. We needed something reliable.

So we switched to JSON.

Modern agents now use a "Dual Brain". They think in strict JSON but talk to you in Markdown.

### The Kitchen vs. The Dining Room

Think of a restaurant.

- **The Kitchen (JSON):** This is the back. It's precise. Orders are strict data: {"order": "burger", "cheese": false}. You don't want a poem here; you want the right order.
- **The Dining Room (Markdown):** This is the front. The waiter (the Chat UI) presents the meal nicely.

### The Code Behind the Curtain

When you ask an agent to "Fix the login bug," you don't see the internal work.

#### 1. The Internal Thought (JSON)

First, the system forces the model to fill out a specific form:

```json
{
    "thought_process": "User has a login error. I need to check auth.py.",
    "tool_call": {
        "name": "read_file",
        "arguments": {
            "path": "src/auth.py",
            "lines": "1-50"
        }
    }
}
```

Because this is strict JSON, the tool works instantly. It doesn't have to guess what the model meant.

#### 2. The External Output (Markdown)

Once the tool gets the data, the agent switches back to chat mode to explain it to you:

**Agent:** "I checked auth.py. Your token is expiring too fast. Here is the fix..."

## The Future

Markdown is for people. JSON is for agents.

The love for Markdown you see in tools like Cursor is just the interface—a mask to make the agent look like a helpful colleague. But deep down, they are thinking in database transactions.

Next time you see a nice Markdown response, remember: that’s just the menu. The real cooking happened in JSON.
