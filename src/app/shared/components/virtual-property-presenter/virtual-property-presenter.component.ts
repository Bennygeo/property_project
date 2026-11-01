import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Property } from '../../../core/models/property.model';
import {
  ElevenLabsTtsService,
  ElevenLabsAlignment
} from '../../../core/services/elevenlabs-tts.service';

export type MouthViseme =
  | 'rest'
  | 'mbp'
  | 'aa'
  | 'oh'
  | 'oo'
  | 'ee'
  | 'ih'
  | 'fv'
  | 'sz'
  | 'l_th';

@Component({
  selector: 'app-virtual-property-presenter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './virtual-property-presenter.component.html',
  styleUrls: ['./virtual-property-presenter.component.css']
})
export class VirtualPropertyPresenterComponent implements OnInit, OnDestroy, OnChanges {
  @Input() property: Property | null = null;
  @Input() triggerDelaySeconds = 30;
  @Output() scheduleVisitClicked = new EventEmitter<void>();

  readonly ttsService = inject(ElevenLabsTtsService);
  private readonly ngZone = inject(NgZone);

  // Character visibility (Appears after 30s on the Property Details page)
  readonly isVisible = signal<boolean>(false);
  readonly isSettingsOpen = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly isPaused = signal<boolean>(false);

  // Script & Voice configuration inputs
  readonly scriptText = signal<string>('');
  readonly inputApiKey = signal<string>('');
  readonly inputVoiceId = signal<string>('');
  readonly customVoiceIdInput = signal<string>('');

  // Real-time 60fps Character Animation Signals
  readonly currentViseme = signal<MouthViseme>('rest');
  readonly headNodY = signal<number>(0);
  readonly headTiltDeg = signal<number>(0);
  readonly browLiftY = signal<number>(0);
  readonly isBlinking = signal<boolean>(false);
  readonly eyeLookX = signal<number>(0);
  readonly handGesturePhase = signal<number>(0);

  // Timers & Web Audio API handles
  private dwellTimer: any = null;
  private blinkTimer: any = null;
  private animFrameId: number | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private activeAlignment: ElevenLabsAlignment | null = null;
  private fallbackStartTimestamp = 0;

  ngOnInit(): void {
    this.inputApiKey.set(this.ttsService.apiKey());
    this.inputVoiceId.set(this.ttsService.voiceId());
    this.refreshScriptFromProperty();
    this.startNaturalBlinkLoop();
    this.start30SecondDwellTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['property'] && !changes['property'].firstChange) {
      this.stopSpeech();
      this.refreshScriptFromProperty();
      this.isVisible.set(false);
      this.start30SecondDwellTimer();
    }
  }

  ngOnDestroy(): void {
    this.clearDwellTimer();
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
    }
    this.stopSpeech();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  }

  private refreshScriptFromProperty(): void {
    const generated = this.ttsService.buildPropertyNarrationScript(this.property);
    this.scriptText.set(generated);
  }

  /**
   * Starts the 30-second engagement timer on the Property Details page.
   * Once 30 seconds pass, the character stands at the bottom edge and speaks.
   */
  private start30SecondDwellTimer(): void {
    this.clearDwellTimer();
    const delayMs = Math.max(1000, this.triggerDelaySeconds * 1000);
    this.dwellTimer = setTimeout(() => {
      this.isVisible.set(true);
      this.startNarration();
    }, delayMs);
  }

  private clearDwellTimer(): void {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
  }

  /**
   * Natural eye blinking + subtle eye saccades every 2.5 - 5 seconds
   */
  private startNaturalBlinkLoop(): void {
    const scheduleNextBlink = () => {
      const nextDelay = 2400 + Math.random() * 2600;
      this.blinkTimer = setTimeout(() => {
        this.isBlinking.set(true);
        if (Math.random() > 0.45) {
          this.eyeLookX.set((Math.random() - 0.5) * 3.0);
        } else {
          this.eyeLookX.set(0);
        }
        setTimeout(() => {
          this.isBlinking.set(false);
          scheduleNextBlink();
        }, 140);
      }, nextDelay);
    };
    scheduleNextBlink();
  }

  /**
   * Clicking the character toggles pause/resume or replays the speech
   */
  onCharacterClick(): void {
    if (this.isSpeaking()) {
      this.togglePlayPause();
    } else {
      this.startNarration();
    }
  }

  /**
   * Right-clicking the character opens the ElevenLabs Voice & Script setup popup
   */
  onCharacterRightClick(event: MouseEvent): void {
    event.preventDefault();
    this.isSettingsOpen.set(true);
  }

  saveVoiceSettingsAndSpeak(): void {
    const finalVoiceId = this.customVoiceIdInput().trim() || this.inputVoiceId().trim();
    this.ttsService.saveCredentials(this.inputApiKey(), finalVoiceId);
    this.inputVoiceId.set(finalVoiceId);
    this.isSettingsOpen.set(false);
    this.startNarration();
  }

  /**
   * Synthesize speech via ElevenLabs and start lip-synced character animation
   */
  async startNarration(): Promise<void> {
    this.stopSpeech();

    const text = this.scriptText().trim();
    if (!text) return;

    try {
      const activeVoice = this.customVoiceIdInput().trim() || this.inputVoiceId().trim();
      const result = await this.ttsService.synthesizeSpeech(text, activeVoice);

      if (result.source === 'elevenlabs' && result.audioUrl) {
        this.activeAlignment = result.alignment;
        await this.playElevenLabsAudio(result.audioUrl, text);
      } else {
        this.playFallbackNeuralSpeech(text);
      }
    } catch {
      this.playFallbackNeuralSpeech(text);
    }
  }

  /**
   * Play ElevenLabs MP3 audio with Web Audio API AnalyserNode + Timestamp Lip-Sync
   */
  private async playElevenLabsAudio(audioUrl: string, fallbackText: string): Promise<void> {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume().catch(() => {});
      }

      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = audioUrl;
      this.audioEl = audio;

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.42;

      this.sourceNode = this.audioCtx.createMediaElementSource(audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      audio.onended = () => {
        this.resetCharacterToIdle();
      };

      await audio.play();
      this.isSpeaking.set(true);
      this.isPaused.set(false);
      this.start60FpsAudioSyncLoop();
    } catch {
      // If autoplay was blocked by browser before user gesture, wait for character click or run fallback
      this.playFallbackNeuralSpeech(fallbackText);
    }
  }

  /**
   * 60 FPS Lip-Sync Loop driven by ElevenLabs timestamps + Web Audio API frequency formants
   */
  private start60FpsAudioSyncLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }

    const freqData = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 128);

    const tick = () => {
      if (!this.isSpeaking() || this.isPaused() || !this.audioEl) {
        return;
      }

      const currentTime = this.audioEl.currentTime || 0;

      let lowEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;

      if (this.analyser) {
        this.analyser.getByteFrequencyData(freqData);

        for (let i = 2; i <= 10; i++) lowEnergy += freqData[i];
        lowEnergy /= 9;

        for (let i = 11; i <= 48; i++) midEnergy += freqData[i];
        midEnergy /= 38;

        for (let i = 49; i <= 110; i++) highEnergy += freqData[i];
        highEnergy /= 62;
      }

      const overallVolume = (lowEnergy * 0.45 + midEnergy * 0.4 + highEnergy * 0.15) / 255;

      let targetViseme: MouthViseme = 'rest';
      if (this.activeAlignment && this.activeAlignment.characters?.length) {
        const viseme = this.resolveVisemeFromAlignment(currentTime, this.activeAlignment);
        targetViseme = overallVolume < 0.03 ? 'rest' : viseme;
      } else {
        targetViseme = this.resolveVisemeFromFormants(lowEnergy, midEnergy, highEnergy, overallVolume);
      }

      this.currentViseme.set(targetViseme);

      const now = performance.now() * 0.004;
      this.headNodY.set(Math.sin(now * 1.4) * 1.6 + overallVolume * 3.0);
      this.headTiltDeg.set(Math.sin(now * 0.85) * 1.8);
      this.browLiftY.set(overallVolume > 0.35 ? -2.2 : overallVolume > 0.18 ? -1.0 : 0);
      this.handGesturePhase.set(Math.sin(now * 1.25) * (0.4 + overallVolume));

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.ngZone.runOutsideAngular(() => {
      const wrappedTick = () => {
        this.ngZone.run(() => tick());
      };
      this.animFrameId = requestAnimationFrame(wrappedTick);
    });
  }

  private resolveVisemeFromAlignment(
    currentTime: number,
    alignment: ElevenLabsAlignment
  ): MouthViseme {
    const chars = alignment.characters;
    const starts = alignment.character_start_times_seconds;
    const ends = alignment.character_end_times_seconds;

    let activeCharIdx = -1;
    for (let i = 0; i < chars.length; i++) {
      if (currentTime >= starts[i] && currentTime <= ends[i] + 0.04) {
        activeCharIdx = i;
        break;
      }
    }

    if (activeCharIdx === -1) return 'rest';

    const ch = (chars[activeCharIdx] || '').toLowerCase();
    const nextCh = (chars[activeCharIdx + 1] || '').toLowerCase();
    return this.charToViseme(ch, ch + nextCh);
  }

  private charToViseme(ch: string, digraph: string): MouthViseme {
    if (!ch || ch === ' ' || ch === '.' || ch === ',' || ch === '!' || ch === '?') {
      return 'rest';
    }
    if (digraph === 'oo' || digraph === 'ou' || digraph === 'ow') return 'oo';
    if (digraph === 'ee' || digraph === 'ea' || digraph === 'ie') return 'ee';
    if (digraph === 'th' || digraph === 'll') return 'l_th';
    if (digraph === 'sh' || digraph === 'ch') return 'sz';
    if (digraph === 'ph') return 'fv';

    switch (ch) {
      case 'm':
      case 'b':
      case 'p':
        return 'mbp';
      case 'f':
      case 'v':
        return 'fv';
      case 's':
      case 'z':
      case 'c':
      case 'x':
      case 'j':
        return 'sz';
      case 'l':
      case 'n':
      case 't':
      case 'd':
      case 'r':
        return 'l_th';
      case 'a':
        return 'aa';
      case 'o':
        return 'oh';
      case 'u':
      case 'w':
      case 'q':
        return 'oo';
      case 'e':
      case 'y':
        return 'ee';
      default:
        return 'ih';
    }
  }

  private resolveVisemeFromFormants(
    low: number,
    mid: number,
    high: number,
    overallVolume: number
  ): MouthViseme {
    if (overallVolume < 0.035) return 'rest';
    if (overallVolume < 0.08) return 'mbp';

    if (high > mid * 1.15 && high > 55) {
      return high > 95 ? 'sz' : 'fv';
    }
    if (low > 135 && mid > 110) {
      return mid > low ? 'aa' : 'oh';
    }
    if (low > 115 && mid <= 95) {
      return 'oo';
    }
    if (mid > 105) {
      return high > 65 ? 'ee' : 'ih';
    }
    return overallVolume > 0.18 ? 'l_th' : 'ih';
  }

  private playFallbackNeuralSpeech(text: string): void {
    const words = text.trim().split(/\s+/);
    const estimatedSeconds = Math.max(10, Math.min(30, Math.round(words.length / 2.6)));
    this.isSpeaking.set(true);
    this.isPaused.set(false);
    this.fallbackStartTimestamp = performance.now();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(v => /en[-_]IN/i.test(v.lang) && /natural|neural|google|microsoft/i.test(v.name)) ||
        voices.find(v => /natural|neural|google/i.test(v.name) && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        this.resetCharacterToIdle();
      };

      window.speechSynthesis.speak(utterance);
    }

    const totalMs = estimatedSeconds * 1000;
    const chars = text.split('');

    const fallbackTick = () => {
      if (!this.isSpeaking() || this.isPaused()) return;

      const elapsedMs = performance.now() - this.fallbackStartTimestamp;
      if (elapsedMs >= totalMs) {
        this.resetCharacterToIdle();
        return;
      }

      const progress = elapsedMs / totalMs;
      const charPos = Math.min(chars.length - 1, Math.floor(progress * chars.length));
      const ch = (chars[charPos] || '').toLowerCase();
      const nextCh = (chars[charPos + 1] || '').toLowerCase();
      const viseme = this.charToViseme(ch, ch + nextCh);

      const t = performance.now() * 0.012;
      const simulatedEnergy = viseme === 'rest' ? 0.05 : 0.35 + Math.abs(Math.sin(t)) * 0.55;

      this.currentViseme.set(viseme);
      this.headNodY.set(Math.sin(t * 0.35) * 2.2);
      this.headTiltDeg.set(Math.cos(t * 0.22) * 1.8);
      this.browLiftY.set(simulatedEnergy > 0.65 ? -2.2 : 0);
      this.handGesturePhase.set(Math.sin(t * 0.3) * (0.4 + simulatedEnergy));

      this.animFrameId = requestAnimationFrame(fallbackTick);
    };

    this.animFrameId = requestAnimationFrame(fallbackTick);
  }

  togglePlayPause(): void {
    if (!this.isSpeaking()) {
      this.startNarration();
      return;
    }

    if (this.isPaused()) {
      this.isPaused.set(false);
      if (this.audioEl) {
        this.audioEl.play();
        this.start60FpsAudioSyncLoop();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    } else {
      this.isPaused.set(true);
      this.currentViseme.set('rest');
      if (this.audioEl) {
        this.audioEl.pause();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    }
  }

  stopSpeech(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
      this.audioEl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.resetCharacterToIdle();
  }

  private resetCharacterToIdle(): void {
    this.isSpeaking.set(false);
    this.isPaused.set(false);
    this.currentViseme.set('rest');
    this.headNodY.set(0);
    this.headTiltDeg.set(0);
    this.browLiftY.set(0);
    this.handGesturePhase.set(0);
  }
}
