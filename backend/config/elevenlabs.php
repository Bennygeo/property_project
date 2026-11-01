<?php
/**
 * ElevenLabs Text-to-Speech & Voice Cloning Configuration
 *
 * You can set your ElevenLabs API Key and Trained/Cloned Voice ID here
 * or via environment variables (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID),
 * or pass them dynamically from the frontend Virtual Presenter settings.
 */

declare(strict_types=1);

namespace Mannidam\Config;

class ElevenLabsConfig {
    /**
     * Get ElevenLabs API Key
     */
    public static function getApiKey(): string {
        return $_ENV['ELEVENLABS_API_KEY']
            ?? getenv('ELEVENLABS_API_KEY')
            ?: ''; // Add your ElevenLabs API key here or configure via UI
    }

    /**
     * Get Default / Cloned Voice ID
     * Default: 'JBFqnCBsd6RMkjVDRZzb' (George - warm, natural storyteller)
     * Replace with your trained/cloned Voice ID from ElevenLabs VoiceLab.
     */
    public static function getDefaultVoiceId(): string {
        return $_ENV['ELEVENLABS_VOICE_ID']
            ?? getenv('ELEVENLABS_VOICE_ID')
            ?: 'JBFqnCBsd6RMkjVDRZzb';
    }

    /**
     * Get Default Model ID
     * 'eleven_multilingual_v2' supports realistic human prosody, Indian English, Tamil, Hindi, and cloned voices.
     */
    public static function getDefaultModelId(): string {
        return $_ENV['ELEVENLABS_MODEL_ID']
            ?? getenv('ELEVENLABS_MODEL_ID')
            ?: 'eleven_multilingual_v2';
    }
}

