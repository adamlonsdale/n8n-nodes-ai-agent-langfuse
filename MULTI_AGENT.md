# Multi-Agent Usage with AgentWithLangfuse

## Overview

The AgentWithLangfuse node can now be used as a tool by other AI agents, enabling multi-agent scenarios. This allows you to create hierarchical agent systems where one agent can delegate tasks to specialized sub-agents.

## Features

- **Tool Output**: The node provides an `ai_tool` output that can be connected to other AI agents
- **Session ID Inheritance**: When used as a tool, the agent automatically inherits the session ID from its parent agent
- **Unified Tracing**: All tool calls, LLM interactions, and memory operations are traced under the same Langfuse session
- **Custom Tool Description**: Configure how the agent appears to parent agents

## How to Use

### 1. Configure the Agent as a Tool

1. Add an AgentWithLangfuse node to your workflow
2. Configure it with:
   - A language model
   - Any tools or memory it needs
   - Langfuse credentials
   - (Optional) A custom tool description

3. The node will automatically have two outputs:
   - **Response**: Regular output for direct use
   - **Tool**: Connect this to the parent agent's Tool input

### 2. Connect to a Parent Agent

1. Create a parent AgentWithLangfuse node (or standard AI Agent)
2. Connect the child agent's **Tool** output to the parent agent's **Tool** input
3. The parent agent can now invoke the child agent as a tool

### 3. Session ID Inheritance

When the parent agent invokes the child agent as a tool:

- If the child agent has **no session ID set**, it will automatically inherit the parent's session ID
- If the child agent **has a session ID set**, it will use its own session ID
- Metadata from the parent is merged with the child's metadata
- The `parentAgent` field is automatically added to track the hierarchy

### Example Workflow

```
┌─────────────────────────┐
│   Parent Agent          │
│  (Customer Service)     │
│                         │
│  Session ID: session-123│
└────────┬────────────────┘
         │
         │ uses as tool
         │
         ├─────────────────┐
         │                 │
    ┌────▼──────┐    ┌────▼──────┐
    │  Order    │    │  Shipping │
    │  Agent    │    │  Agent    │
    │           │    │           │
    │(inherits) │    │(inherits) │
    │session-123│    │session-123│
    └───────────┘    └───────────┘
```

All three agents will log to the same session in Langfuse, making it easy to trace the entire conversation flow.

## Configuration Options

### Tool Description

The **Tool Description** parameter allows you to customize how the agent appears to parent agents:

```
Good tool description:
"Analyzes order status and provides detailed information about shipping, tracking, and delivery estimates. Use this when customers ask about their orders."

Bad tool description:
"Order tool"
```

If left empty, a default description will be generated based on the node name and workflow name.

### Langfuse Metadata

When configuring the child agent, you can:

- **Leave session ID empty**: Child will inherit parent's session ID
- **Set a specific session ID**: Child will use its own session ID (useful for testing)
- **Set custom metadata**: Will be merged with parent's metadata

## Best Practices

### 1. Clear Tool Descriptions

Give each agent a clear, descriptive tool description that explains:
- What the agent does
- When to use it
- What kind of inputs it expects

### 2. Session ID Management

For production multi-agent systems:
- Let child agents inherit the parent's session ID (leave it empty)
- Use custom session IDs only for testing individual agents

### 3. Metadata Organization

Use metadata to track the agent hierarchy:
```json
{
  "workflow": "customer-service",
  "tier": "specialized",
  "department": "orders"
}
```

### 4. Error Handling

Child agents should:
- Return clear error messages
- Handle edge cases gracefully
- Provide actionable information to parent agents

## Limitations

1. **Circular Dependencies**: Avoid creating circular agent references (A calls B, B calls A)
2. **Depth Limits**: Very deep agent hierarchies may hit execution time limits
3. **Context Limits**: Each agent consumes tokens; deep hierarchies use more context

## Troubleshooting

### Child agent not appearing as a tool

**Check:**
- The Tool output is connected to the parent agent
- The parent agent's Tools input is properly configured
- Both agents have their required inputs configured (model, credentials)

### Session IDs not inheriting

**Check:**
- The child agent's session ID parameter is empty or not set
- The parent agent has a session ID configured
- Both agents are using the same Langfuse credentials

### Tracing not showing in Langfuse

**Check:**
- Langfuse credentials are correctly configured
- The base URL is accessible from your n8n instance
- Session IDs are properly set or inherited

## Example Use Cases

### 1. Customer Service Hub

Parent agent that routes to specialized agents:
- Order Status Agent
- Shipping Information Agent
- Returns & Refunds Agent
- Product Information Agent

### 2. Data Analysis Pipeline

Parent agent that delegates:
- Data Retrieval Agent
- Data Cleaning Agent
- Analysis Agent
- Visualization Agent

### 3. Multi-Domain Expert System

Parent agent with domain specialists:
- Technical Support Agent
- Billing Agent
- Product Specialist Agent
- Account Management Agent

## Advanced: Accessing Parent Context

The child agent can access information about being called as a tool through the metadata:

- `parentAgent`: Name of the parent agent node
- Parent's custom metadata is merged into child's metadata

This allows child agents to adapt their behavior based on the calling context.
