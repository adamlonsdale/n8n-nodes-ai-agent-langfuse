import { DynamicTool } from '@langchain/core/tools';
import { NodeOperationError } from 'n8n-workflow';
import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';

import { toolsAgentExecute } from './execute';

/**
 * Supply data method that allows the AgentWithLangfuse node to be used as a tool
 * by other AI agents. This enables multi-agent scenarios and inherits the session ID
 * from parent agents.
 */
export async function agentWithLangfuseSupplyData(
	this: ISupplyDataFunctions,
): Promise<SupplyData> {
	const node = this.getNode();
	const workflowName = this.getWorkflow().name;

	// Get tool configuration
	const toolDescription =
		(this.getNodeParameter('toolDescription', 0, '') as string) ||
		`Execute the "${node.name}" agent in workflow "${workflowName}". The agent can analyze requests, use available tools, and provide comprehensive responses.`;

	// Store reference to the original context
	const originalContext = this;

	// Create the tool that will invoke this agent
	const tool = new DynamicTool({
		name: node.name.toLowerCase().replace(/[^a-z0-9]/gi, '_'),
		description: toolDescription,
		func: async (input: string) => {
			try {
				// Try to get parent agent's Langfuse context if available from additional data
				let parentSessionId: string | undefined;
				let parentUserId: string | undefined;
				let parentMetadata: Record<string, any> | undefined;

				// Attempt to access additional data from the context (may not always be available)
				try {
					const additionalData = (originalContext as any).additionalData;
					if (additionalData) {
						parentSessionId = additionalData.sessionId;
						parentUserId = additionalData.userId;
						parentMetadata = additionalData.metadata;
					}
				} catch (error) {
					// Additional data not available, continue without it
				}

				// Create a wrapper function for getNodeParameter that intercepts specific parameters
				const wrappedGetNodeParameter = (
					parameterName: string,
					itemIndex: number,
					fallbackValue?: any,
				): any => {
					// Override text input with the tool's input
					if (parameterName === 'text') {
						return input;
					}
					// Set prompt type to 'define' to use the text parameter
					if (parameterName === 'promptType') {
						return 'define';
					}
					// Inherit Langfuse metadata from parent
					if (parameterName === 'langfuseMetadata') {
						const metadata = originalContext.getNodeParameter('langfuseMetadata', itemIndex, {}) as any;
						
						// Inherit session ID from parent if not set and parent has one
						if (parentSessionId && !metadata.sessionId) {
							metadata.sessionId = parentSessionId;
						}
						
						// Inherit user ID from parent if not set and parent has one
						if (parentUserId && !metadata.userId) {
							metadata.userId = parentUserId;
						}
						
						// Merge custom metadata from parent
						if (parentMetadata) {
							const currentMetadata = typeof metadata.customMetadata === 'string'
								? JSON.parse(metadata.customMetadata)
								: (metadata.customMetadata || {});
							metadata.customMetadata = {
								...parentMetadata,
								...currentMetadata,
								parentAgent: node.name,
							};
						}
						
						return metadata;
					}
					
					// For all other parameters, use the original method
					return originalContext.getNodeParameter(parameterName, itemIndex, fallbackValue);
				};

				// Create a modified context object
				const modifiedContext: ISupplyDataFunctions = {
					...originalContext,
					getNodeParameter: wrappedGetNodeParameter,
				};

				// Execute the agent with the provided input using the modified context
				const result = await toolsAgentExecute.call(modifiedContext);

				// Extract the output from the result
				if (result && result[0] && result[0][0]) {
					const output = result[0][0].json;
					if (typeof output === 'object' && output.output) {
						return typeof output.output === 'string'
							? output.output
							: JSON.stringify(output.output);
					}
					return JSON.stringify(output);
				}

				return 'Agent executed successfully but returned no output';
			} catch (error) {
				throw new NodeOperationError(
					node,
					`Error executing agent as tool: ${error.message}`,
				);
			}
		},
	});

	return {
		response: tool,
	};
}
