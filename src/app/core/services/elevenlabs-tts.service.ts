import { Injectable, signal } from '@angular/core';
import { Property } from '../models/property.model';

export interface ElevenLabsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface ElevenLabsTtsResult {
  audioUrl: string;
  alignment: ElevenLabsAlignment | null;
  source: 'elevenlabs' | 'fallback';
}

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  isCustomClone?: boolean;
}

const STORAGE_KEY_API = 'mannidam_elevenlabs_api_key';
const STORAGE_KEY_VOICE = 'mannidam_elevenlabs_voice_id';
const STORAGE_KEY_MODEL = 'mannidam_elevenlabs_model_id';

@Injectable({
  providedIn: 'root'
})
export class ElevenLabsTtsService {
  readonly presets: VoicePreset[] = [
    {
      id: 'JBFqnCBsd6RMkjVDRZzb',
      name: 'George (Warm Property Advisor)',
      description: 'Natural, trustworthy conversational voice'
    },
    {
      id: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Sarah (Clear Concierge Host)',
      description: 'Warm, articulate female presenter voice'
    },
    {
      id: 'onwK4e9ZLuTAKqWW03F9',
      name: 'Daniel (Executive Consultant)',
      description: 'Authoritative, calm real estate specialist'
    },
    {
      id: 'pFZP5JQG7iQjIQuC4Bku',
      name: 'Lily (Friendly Site Guide)',
      description: 'Expressive, welcoming narration tone'
    }
  ];

  readonly apiKey = signal<string>(this.loadFromStorage(STORAGE_KEY_API, ''));
  readonly voiceId = signal<string>(this.loadFromStorage(STORAGE_KEY_VOICE, 'JBFqnCBsd6RMkjVDRZzb'));
  readonly modelId = signal<string>(this.loadFromStorage(STORAGE_KEY_MODEL, 'eleven_multilingual_v2'));

  // In-memory blob cache keyed by voiceId + text
  private memoryCache = new Map<string, ElevenLabsTtsResult>();

  private loadFromStorage(key: string, fallback: string): string {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    return localStorage.getItem(key) || fallback;
  }

  saveCredentials(apiKey: string, voiceId: string, modelId = 'eleven_multilingual_v2'): void {
    const cleanKey = apiKey.trim();
    const cleanVoice = voiceId.trim() || 'JBFqnCBsd6RMkjVDRZzb';
    const cleanModel = modelId.trim() || 'eleven_multilingual_v2';

    this.apiKey.set(cleanKey);
    this.voiceId.set(cleanVoice);
    this.modelId.set(cleanModel);

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_API, cleanKey);
      localStorage.setItem(STORAGE_KEY_VOICE, cleanVoice);
      localStorage.setItem(STORAGE_KEY_MODEL, cleanModel);
    }
  }

  /**
   * Build a natural, conversational 15–25 second narration script for a property.
   */
  buildPropertyNarrationScript(prop: Property | null): string {
    if (!prop) {
      return 'Welcome to Find a Plot Verified Registry. I am your virtual property concierge. Take a look at the verified legal clearances, road dimensions, and transit connectivity on this page, or schedule a site visit anytime.';
    }

    const title = prop.title || prop.masterDetails?.projectName || 'this verified property';
    const locality = prop.villageLocality || prop.locality || prop.masterDetails?.villageLocality || prop.city || 'a prime growth corridor';
    const approval = (prop.dtcpApproved === 'Yes' || prop.masterDetails?.dtcpApproved === 'Yes')
      ? 'DTCP and RERA approved'
      : (prop.badges?.rera || 'clear-title verified');
    const roadWidth = prop.masterDetails?.roadWidthFt
      ? `${prop.masterDetails.roadWidthFt} feet wide`
      : (prop.plotDetails?.frontageRoadWidth || '30 feet wide');
    const maintYears = prop.masterDetails?.developerMaintenanceYears || 2;
    const priceText = prop.price ? `priced at ${prop.price}` : 'available with bank loan approval';

    return `Hello there! I noticed you have been exploring ${title} in ${locality}. ` +
      `This is a ${approval} development, ${priceText}, featuring ${roadWidth} approach roads, ready electricity and sweet groundwater access. ` +
      `Plus, the developer includes ${maintYears} years of completely free site maintenance. ` +
      `Would you like to book a free guided site visit or get the full dossier on WhatsApp?`;
  }

  /**
   * Synthesize speech via ElevenLabs (with timestamps for lip-sync).
   * Tries PHP backend first (for disk caching), then direct ElevenLabs REST call.
   */
  async synthesizeSpeech(text: string, customVoiceId?: string): Promise<ElevenLabsTtsResult> {
    const cleanText = text.trim();
    const activeVoiceId = (customVoiceId || this.voiceId() || 'JBFqnCBsd6RMkjVDRZzb').trim();
    const activeModelId = this.modelId() || 'eleven_multilingual_v2';
    const activeKey = this.apiKey().trim();

    const cacheKey = `${activeVoiceId}|${activeModelId}|${cleanText}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Try PHP backend endpoint (which handles server-side disk caching & server ENV key)
    try {
      const backendRes = await fetch('/backend/api/tts/elevenlabs.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceId: activeVoiceId,
          modelId: activeModelId,
          apiKey: activeKey
        })
      });

      if (backendRes.ok) {
        const json = await backendRes.json();
        if (json?.success && json?.data?.audioBase64) {
          const audioUrl = this.base64ToBlobUrl(json.data.audioBase64, 'audio/mpeg');
          const result: ElevenLabsTtsResult = {
            audioUrl,
            alignment: json.data.alignment || null,
            source: 'elevenlabs'
          };
          this.memoryCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Backend might not be running on same origin in ng serve; proceed to direct ElevenLabs call
    }

    // 2. Direct ElevenLabs API call if client API key is present
    if (activeKey) {
      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(activeVoiceId)}/with-timestamps`;
      const directRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'xi-api-key': activeKey
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: activeModelId,
          voice_settings: {
            stability: 0.50,
            similarity_boost: 0.80,
            style: 0.35,
            use_speaker_boost: true
          }
        })
      });

      if (directRes.ok) {
        const data = await directRes.json();
        if (data?.audio_base64) {
          const audioUrl = this.base64ToBlobUrl(data.audio_base64, 'audio/mpeg');
          const result: ElevenLabsTtsResult = {
            audioUrl,
            alignment: data.alignment || data.normalized_alignment || null,
            source: 'elevenlabs'
          };
          this.memoryCache.set(cacheKey, result);
          return result;
        }
      } else {
        const errText = await directRes.text().catch(() => '');
        console.warn('ElevenLabs direct API returned non-OK:', directRes.status, errText);
      }
    }

    // 3. Return fallback indicator if no ElevenLabs key is configured yet
    return {
      audioUrl: '',
      alignment: null,
      source: 'fallback'
    };
  }

  private base64ToBlobUrl(base64: string, mimeType: string): string {
    const byteCharacters = atob(base64);
    const byteArrays: Uint8Array[] = [];
    const sliceSize = 1024;

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    const blob = new Blob(byteArrays as BlobPart[], { type: mimeType });
    return URL.createObjectURL(blob);
  }
}

