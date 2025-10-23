import type { LanguageCode } from "../../schema";
import { callGeminiWithStructuredOutput, createLanguageDetectionConfig, type GeminiInput } from "./geminiUtils";

// Type definitions for Gemini API structured output
export type GeminiLanguageDetection = {
	target_languages: string[];
	dominant_language: string;
	reason: string;
};

// Input type for the detection function
export type GeminiDetectionInput = {
	title?: string;
	description?: string;
	url?: string;
};

// Result type with mapped language codes
export type GeminiDetectionResult = {
	target_languages: LanguageCode[];
	dominant_language: LanguageCode | null;
	reason: string;
	success: boolean;
	error?: string;
};

// Map detected language codes to our supported LanguageCode type
function mapToSupportedLanguageCode(langCode: string): LanguageCode | null {
	const langMap: Record<string, LanguageCode> = {
		'en': 'en',
		'es': 'es',
		'fr': 'fr',
		'de': 'de',
		'it': 'it',
		'pt': 'pt',
		'ru': 'ru',
		'ja': 'ja',
		'ko': 'ko',
		'zh': 'zh',
		'zh-CN': 'zh',
		'zh-TW': 'zh',
		'ar': 'ar',
		'hi': 'hi',
		'tr': 'tr',
	};
	return langMap[langCode] || null;
}

/**
 * Detect what language(s) content is about using Gemini
 * Uses the generic Gemini utility for structured output
 */
export async function detectLanguageWithGemini(
	input: GeminiDetectionInput
): Promise<GeminiDetectionResult> {
	console.debug('[geminiLanguageDetection] Starting language detection', {
		url: input.url,
		title: input.title,
		description: input.description,
	});
	

	// Use the generic Gemini utility
	const result = await callGeminiWithStructuredOutput<GeminiLanguageDetection>(
		input as GeminiInput,
		createLanguageDetectionConfig()
	);

	if (!result.success || !result.data) {
		return {
			target_languages: [],
			dominant_language: null,
			reason: result.reason || 'Detection failed',
			success: false,
			error: result.error
		};
	}

	// Map the detected language codes to our supported types
	const mappedTargetLanguages = result.data.target_languages
		.map(mapToSupportedLanguageCode)
		.filter((lang): lang is LanguageCode => lang !== null);

	const mappedDominantLanguage = mapToSupportedLanguageCode(result.data.dominant_language);

	console.debug('[geminiLanguageDetection] Detection completed', {
		original: result.data,
		mapped: {
			target_languages: mappedTargetLanguages,
			dominant_language: mappedDominantLanguage
		}
	});

	return {
		target_languages: mappedTargetLanguages,
		dominant_language: mappedDominantLanguage,
		reason: result.data.reason,
		success: true
	};
}