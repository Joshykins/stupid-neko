import { GoogleGenAI } from '@google/genai';
import { tryCatch } from '../../../lib/tryCatch';

// Fixed model type - only gemini-2.5-flash-lite is supported
type GeminiModel = 'gemini-2.5-flash-lite';

// Generic types for Gemini structured output
export type GeminiStructuredOutput<T> = {
	success: boolean;
	data?: T;
	error?: string;
	reason?: string;
};

export type GeminiInput = {
	url?: string;
	title?: string;
	description?: string;
	content?: string;
};

export type GeminiConfig = {
	responseSchema: Record<string, any>;
	prompt: string;
};

/**
 * Generic Gemini utility for structured output
 * Handles API calls, JSON parsing, markdown cleaning, and error handling
 */
export async function callGeminiWithStructuredOutput<T>(
	input: GeminiInput,
	config: GeminiConfig
): Promise<GeminiStructuredOutput<T>> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		console.debug('[geminiUtils] No API key available');
		return {
			success: false,
			error: 'GEMINI_API_KEY not configured',
		};
	}

	// Fixed model - only gemini-2.5-flash-lite is supported
	const model: GeminiModel = 'gemini-2.5-flash-lite';

	try {
		const genAI = new GoogleGenAI({ apiKey });

		// Construct the content to analyze - prioritize title/description, URL is just for context
		let content: string;
		const titleDesc = [
			(input.title || '').trim(),
			(input.description || '').trim(),
		]
			.filter(Boolean)
			.join('\n\n');

		if (titleDesc) {
			// Use title and description as primary content, include URL for context if available
			content = titleDesc;
			if (input.url) {
				content += `\n\nURL: ${input.url}`;
			}
		} else if (input.url) {
			// Fallback to URL only if no title/description available
			content = input.url;
		} else if (input.content) {
			// Use provided content directly
			content = input.content;
		} else {
			content = '';
		}

		if (!content.trim()) {
			return {
				success: false,
				error: 'No content provided for analysis',
			};
		}

		const fullPrompt = `${config.prompt}\n\nContent to analyze:\n${content}`;

		console.debug('[geminiUtils] Calling Gemini API', {
			model,
			contentLength: content.length,
			hasUrl: Boolean(input.url),
			hasTitle: Boolean(input.title),
			hasDescription: Boolean(input.description),
			hasContent: Boolean(input.content),
		});

		const { data: response, error } = await tryCatch(
			genAI.models.generateContent({
				model,
				contents: fullPrompt,
			})
		);

		if (error) {
			console.debug('[geminiUtils] API call failed', { error: error.message });
			return {
				success: false,
				error: error.message,
			};
		}

		// Parse the JSON response
		const responseText = response?.text;
		if (!responseText) {
			console.debug('[geminiUtils] No response text received');
			return {
				success: false,
				error: 'Empty response',
			};
		}

		console.debug('[geminiUtils] Raw response', { responseText });

		// Clean the response text by removing markdown code blocks if present
		let cleanedResponse = responseText.trim();
		if (cleanedResponse.startsWith('```json')) {
			cleanedResponse = cleanedResponse
				.replace(/^```json\s*/, '')
				.replace(/\s*```$/, '');
		} else if (cleanedResponse.startsWith('```')) {
			cleanedResponse = cleanedResponse
				.replace(/^```\s*/, '')
				.replace(/\s*```$/, '');
		}

		console.debug('[geminiUtils] Cleaned response', { cleanedResponse });

		const { data: parsedResult, error: parseError } = await tryCatch(
			Promise.resolve(JSON.parse(cleanedResponse) as T)
		);

		if (parseError) {
			console.debug('[geminiUtils] JSON parse failed', {
				error: parseError.message,
				responseText,
			});
			return {
				success: false,
				error: `JSON parse failed: ${parseError.message}`,
				reason: 'Invalid JSON response',
			};
		}

		console.debug('[geminiUtils] Parsed result', { parsedResult });

		return {
			success: true,
			data: parsedResult,
		};
	} catch (error: any) {
		console.debug('[geminiUtils] Unexpected error', { error: error.message });
		return {
			success: false,
			error: error.message,
			reason: 'Unexpected error occurred',
		};
	}
}

/**
 * Helper function to create a Gemini config for language detection
 */
export function createLanguageDetectionConfig(): GeminiConfig {
	return {
		responseSchema: {
			type: 'object',
			properties: {
				target_languages: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Array of ISO 639-1 language codes that the content is about or teaches',
				},
				dominant_language: {
					type: 'string',
					description:
						'The primary language code if content is about learning a specific language',
				},
				reason: {
					type: 'string',
					description: 'Brief explanation of the detection reasoning',
				},
			},
			required: ['target_languages', 'dominant_language', 'reason'],
		},
		prompt: `You are a language detection and classification model for a language learning app.

Given a piece of content (such as a title, description, or transcript), determine which language(s) the content is primarily ABOUT or CONTAINED IN — meaning the language a learner would be studying if they were engaging with this content.

- If the content is in multiple languages, identify all present and note which is dominant.
- If the content is about learning a language (e.g., "Learn Japanese in 10 minutes"), the target language is the one being learned, not the language of instruction.
- If it's a translation, the target languages are the ones being translated into or demonstrated.
- If the content contains very little language (e.g., emojis, names, numbers), respond with "Unknown".
- Return the ISO 639-1 language code(s) (e.g., "ja" for Japanese, "es" for Spanish, "en" for English) and a brief reason.

IMPORTANT: You must respond with valid JSON in exactly this format:
{
  "target_languages": ["ja", "en"],
  "dominant_language": "ja",
  "reason": "Content is about learning Japanese language"
}`,
	};
}
