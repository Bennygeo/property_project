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
  computed,
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

  // Widget visibility & state
  readonly isExpanded = signal<boolean>(false);
  readonly hasAutoTriggered = signal<boolean>(false);
  readonly isSettingsOpen = signal<boolean>(false);
  readonly isLoadingAudio = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly isPaused = signal<boolean>(false);
  readonly isMuted = signal<boolean>(false);
  readonly autoplayBlockedPrompt = signal<boolean>(false);
  readonly voiceSourceBadge = signal<'elevenlabs' | 'fallback'>('elevenlabs');
  readonly statusMessage = signal<string>('');

  // Script & Voice configuration inputs
  readonly scriptText = signal<string>('');
  readonly inputApiKey = signal<string>('');
  readonly inputVoiceId = signal<string>('');
  readonly customVoiceIdInput = signal<string>('');

  // Real-time 60fps Character Animation Signals
  readonly currentViseme = signal<MouthViseme>('rest');
  readonly jawOpenRatio = signal<number>(0); // 0.0 to 1.0
  readonly headNodY = signal<number>(0);     // -3px to +4px
  readonly headTiltDeg = signal<number>(0);  // -2.5deg to +2.5deg
  readonly browLiftY = signal<number>(0);    // -3px to +1px
  readonly isBlinking = signal<boolean>(false);
  readonly eyeLookX = signal<number>(0);     // -2px to +2px
  readonly handGesturePhase = signal<number>(0);

  // Progress & Live Caption Tracking
  readonly elapsedSeconds = signal<number>(0);
  readonly totalDurationSeconds = signal<number>(20);
  readonly activeWordIndex = signal<number>(-1);
  readonly eqBars = signal<number[]>([15, 22, 18, 25, 14]);

  readonly scriptWords = computed<string[]>(() => {
    const raw = this.scriptText().trim();
    return raw ? raw.split(/\s+/) : [];
  });

  readonly progressPercent = computed<number>(() => {
    const total = this.totalDurationSeconds();
    if (total <= 0) return 0;
    return Math.min(100, Math.round((this.elapsedSeconds() / total) * 100));
  });

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
  private fallbackCharIndex = 0;
  private userHasInteracted = false;
  private interactionListener = () => {
    this.userHasInteracted = true;
  };

  ngOnInit(): void {
    this.inputApiKey.set(this.ttsService.apiKey());
    this.inputVoiceId.set(this.ttsService.voiceId());
    this.refreshScriptFromProperty();

    if (typeof window !== 'undefined') {
      window.addEventListener('click', this.interactionListener, { passive: true });
      window.addEventListener('scroll', this.interactionListener, { passive: true });
      window.addEventListener('keydown', this.interactionListener, { passive: true });
    }

    this.startNaturalBlinkLoop();
    this.start30SecondDwellTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['property'] && !changes['property'].firstChange) {
      this.stopSpeech();
      this.refreshScriptFromProperty();
      this.hasAutoTriggered.set(false);
      this.isExpanded.set(false);
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
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', this.interactionListener);
      window.removeEventListener('scroll', this.interactionListener);
      window.removeEventListener('keydown', this.interactionListener);
    }
  }

  private refreshScriptFromProperty(): void {
    const generated = this.ttsService.buildPropertyNarrationScript(this.property);
    this.scriptText.set(generated);
  }

  /**
   * Starts the 30-second engagement timer on the Property Details page.
   */
  private start30SecondDwellTimer(): void {
    this.clearDwellTimer();
    const delayMs = Math.max(1000, this.triggerDelaySeconds * 1000);
    this.dwellTimer = setTimeout(() => {
      if (!this.hasAutoTriggered()) {
        this.hasAutoTriggered.set(true);
        this.isExpanded.set(true);
        this.startNarration();
      }
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
        // Subtle eye gaze shift
        if (Math.random() > 0.45) {
          this.eyeLookX.set((Math.random() - 0.5) * 3.2);
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
   * Open presenter manually from the launcher pill (even before 30s if user clicks)
   */
  openAndSpeak(): void {
    this.userHasInteracted = true;
    this.hasAutoTriggered.set(true);
    this.clearDwellTimer();
    this.isExpanded.set(true);
    if (!this.isSpeaking()) {
      this.startNarration();
    }
  }

  minimizePresenter(): void {
    this.stopSpeech();
    this.isExpanded.set(false);
    this.isSettingsOpen.set(false);
  }

  toggleSettings(): void {
    this.isSettingsOpen.update(v => !v);
  }

  saveVoiceSettingsAndSpeak(): void {
    const finalVoiceId = this.customVoiceIdInput().trim() || this.inputVoiceId().trim();
    this.ttsService.saveCredentials(this.inputApiKey(), finalVoiceId);
    this.inputVoiceId.set(finalVoiceId);
    this.statusMessage.set('Voice & ElevenLabs settings saved.');
    this.isSettingsOpen.set(false);
    this.startNarration();
  }

  /**
   * Main entry point to synthesize speech via ElevenLabs and start lip-synced animation
   */
  async startNarration(): Promise<void> {
    this.stopSpeech();
    this.autoplayBlockedPrompt.set(false);

    const text = this.scriptText().trim();
    if (!text) return;

    this.isLoadingAudio.set(true);
    this.statusMessage.set('Synthesizing ElevenLabs voice...');

    try {
      const activeVoice = this.customVoiceIdInput().trim() || this.inputVoiceId().trim();
      const result = await this.ttsService.synthesizeSpeech(text, activeVoice);

      this.isLoadingAudio.set(false);

      if (result.source === 'elevenlabs' && result.audioUrl) {
        this.voiceSourceBadge.set('elevenlabs');
        this.statusMessage.set('');
        this.activeAlignment = result.alignment;
        await this.playElevenLabsAudio(result.audioUrl);
      } else {
        this.voiceSourceBadge.set('fallback');
        this.statusMessage.set(
          this.ttsService.apiKey()
            ? 'Using neural fallback voice (check ElevenLabs key/quota)'
            : 'Add your ElevenLabs API Key in Settings for cloned voice'
        );
        this.playFallbackNeuralSpeech(text);
      }
    } catch {
      this.isLoadingAudio.set(false);
      this.voiceSourceBadge.set('fallback');
      this.playFallbackNeuralSpeech(text);
    }
  }

  /**
   * Play ElevenLabs MP3 audio with Web Audio API AnalyserNode + Timestamp Lip-Sync
   */
  private async playElevenLabsAudio(audioUrl: string): Promise<void> {
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
      audio.muted = this.isMuted();
      this.audioEl = audio;

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.45;

      this.sourceNode = this.audioCtx.createMediaElementSource(audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          this.totalDurationSeconds.set(Math.ceil(audio.duration));
        }
      };

      audio.onended = () => {
        this.resetCharacterToIdle();
      };

      await audio.play();
      this.isSpeaking.set(true);
      this.isPaused.set(false);
      this.start60FpsAudioSyncLoop();
    } catch (err) {
      // Browser autoplay policy blocked unmuted playback before user gesture
      this.autoplayBlockedPrompt.set(true);
      this.isSpeaking.set(false);
    }
  }

  /**
   * Resume playback after user clicks "Tap to Play Voice" if browser blocked autoplay
   */
  resumeAfterAutoplayBlock(): void {
    this.userHasInteracted = true;
    this.autoplayBlockedPrompt.set(false);
    if (this.audioEl && this.audioCtx) {
      this.audioCtx.resume().then(() => {
        this.audioEl?.play().then(() => {
          this.isSpeaking.set(true);
          this.start60FpsAudioSyncLoop();
        });
      });
    } else {
      this.startNarration();
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
      this.elapsedSeconds.set(Math.floor(currentTime));

      // 1. Read frequency formants from Web Audio AnalyserNode
      let lowEnergy = 0;  // 100 - 450 Hz (Vowel openness / jaw drop)
      let midEnergy = 0;  // 450 - 2200 Hz (Vowel spread / tongue)
      let highEnergy = 0; // 2200 - 6000 Hz (Sibilants / fricatives S, Z, F, V)

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

      // Update equalizer bars
      this.eqBars.set([
        Math.max(12, Math.min(100, Math.round((lowEnergy / 255) * 100))),
        Math.max(12, Math.min(100, Math.round(((lowEnergy + midEnergy) / 510) * 105))),
        Math.max(12, Math.min(100, Math.round((midEnergy / 255) * 110))),
        Math.max(12, Math.min(100, Math.round(((midEnergy + highEnergy) / 510) * 100))),
        Math.max(12, Math.min(100, Math.round((highEnergy / 255) * 95)))
      ]);

      // 2. Determine Viseme from ElevenLabs Character Timestamps (if present) + Formants
      let targetViseme: MouthViseme = 'rest';

      if (this.activeAlignment && this.activeAlignment.characters?.length) {
        const { viseme, wordIdx } = this.resolveVisemeFromAlignment(currentTime, this.activeAlignment);
        targetViseme = overallVolume < 0.03 ? 'rest' : viseme;
        if (wordIdx >= 0) {
          this.activeWordIndex.set(wordIdx);
        }
      } else {
        // Estimate active word index proportionally from audio progress
        const totalDur = this.audioEl.duration || this.totalDurationSeconds();
        const words = this.scriptWords();
        if (totalDur > 0 && words.length > 0) {
          const idx = Math.min(words.length - 1, Math.floor((currentTime / totalDur) * words.length));
          this.activeWordIndex.set(idx);
        }
        targetViseme = this.resolveVisemeFromFormants(lowEnergy, midEnergy, highEnergy, overallVolume);
      }

      this.currentViseme.set(targetViseme);
      this.jawOpenRatio.set(Math.min(1, overallVolume * 1.65));

      // 3. Drive 2.5D Head Nod, Tilt & Eyebrow expression with vocal energy
      const now = performance.now() * 0.004;
      this.headNodY.set(Math.sin(now * 1.4) * 1.6 + overallVolume * 3.2);
      this.headTiltDeg.set(Math.sin(now * 0.85) * 1.8);
      this.browLiftY.set(overallVolume > 0.38 ? -2.4 : overallVolume > 0.2 ? -1.0 : 0);
      this.handGesturePhase.set(Math.sin(now * 1.2) * (0.4 + overallVolume));

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.ngZone.runOutsideAngular(() => {
      const wrappedTick = () => {
        this.ngZone.run(() => tick());
      };
      this.animFrameId = requestAnimationFrame(wrappedTick);
    });
  }

  /**
   * Maps ElevenLabs alignment characters at currentTime to a phonetic mouth viseme and word index
   */
  private resolveVisemeFromAlignment(
    currentTime: number,
    alignment: ElevenLabsAlignment
  ): { viseme: MouthViseme; wordIdx: number } {
    const chars = alignment.characters;
    const starts = alignment.character_start_times_seconds;
    const ends = alignment.character_end_times_seconds;

    let activeCharIdx = -1;
    let spaceCount = 0;

    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === ' ') {
        if (starts[i] <= currentTime) {
          spaceCount++;
        }
      }
      if (currentTime >= starts[i] && currentTime <= ends[i] + 0.04) {
        activeCharIdx = i;
        break;
      }
    }

    if (activeCharIdx === -1) {
      return { viseme: 'rest', wordIdx: spaceCount };
    }

    const ch = (chars[activeCharIdx] || '').toLowerCase();
    const nextCh = (chars[activeCharIdx + 1] || '').toLowerCase();
    const digraph = ch + nextCh;

    return {
      viseme: this.charToViseme(ch, digraph),
      wordIdx: spaceCount
    };
  }

  /**
   * Maps character/digraph to 1 of 10 anatomical mouth visemes
   */
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
      case 'i':
      case 'h':
      case 'k':
      case 'g':
        return 'ih';
      default:
        return 'ih';
    }
  }

  /**
   * Formant-to-Viseme mapping when playing raw audio streams
   */
  private resolveVisemeFromFormants(
    low: number,
    mid: number,
    high: number,
    overallVolume: number
  ): MouthViseme {
    if (overallVolume < 0.035) return 'rest';
    if (overallVolume < 0.08) return 'mbp';

    // High frequency dominant -> sibilants / fricatives (S, Z, F, V)
    if (high > mid * 1.15 && high > 55) {
      return high > 95 ? 'sz' : 'fv';
    }

    // Strong low + mid energy -> wide open vowels (AA, OH)
    if (low > 135 && mid > 110) {
      return mid > low ? 'aa' : 'oh';
    }

    // Strong low energy but lower mid -> rounded vowel (OO / OH)
    if (low > 115 && mid <= 95) {
      return 'oo';
    }

    // Strong mid energy -> spread vowels (EE, IH, L)
    if (mid > 105) {
      return high > 65 ? 'ee' : 'ih';
    }

    return overallVolume > 0.18 ? 'l_th' : 'ih';
  }

  /**
   * Fallback neural speech with synchronized 60 FPS phonetic viseme animation
   * so the presenter works immediately even before the user enters their ElevenLabs API key.
   */
  private playFallbackNeuralSpeech(text: string): void {
    const words = this.scriptWords();
    const estimatedSeconds = Math.max(10, Math.min(30, Math.round(words.length / 2.6)));
    this.totalDurationSeconds.set(estimatedSeconds);
    this.elapsedSeconds.set(0);
    this.isSpeaking.set(true);
    this.isPaused.set(false);
    this.fallbackStartTimestamp = performance.now();
    this.fallbackCharIndex = 0;

    // Trigger Web Speech API if available and not muted
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && !this.isMuted()) {
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

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word' && typeof event.charIndex === 'number') {
          this.fallbackCharIndex = event.charIndex;
        }
      };

      utterance.onend = () => {
        this.resetCharacterToIdle();
      };

      window.speechSynthesis.speak(utterance);
    }

    // Start 60fps phonetic envelope animation loop
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
      this.elapsedSeconds.set(Math.floor(elapsedMs / 1000));

      const charPos = Math.min(chars.length - 1, Math.floor(progress * chars.length));
      const ch = (chars[charPos] || '').toLowerCase();
      const nextCh = (chars[charPos + 1] || '').toLowerCase();
      const viseme = this.charToViseme(ch, ch + nextCh);

      // Compute active word index
      let spaces = 0;
      for (let i = 0; i <= charPos; i++) {
        if (chars[i] === ' ') spaces++;
      }
      this.activeWordIndex.set(spaces);

      const t = performance.now() * 0.012;
      const simulatedEnergy = viseme === 'rest' ? 0.05 : 0.35 + Math.abs(Math.sin(t)) * 0.55;

      this.currentViseme.set(viseme);
      this.jawOpenRatio.set(simulatedEnergy);
      this.headNodY.set(Math.sin(t * 0.35) * 2.2);
      this.headTiltDeg.set(Math.cos(t * 0.22) * 1.8);
      this.browLiftY.set(simulatedEnergy > 0.65 ? -2.2 : 0);

      this.eqBars.set([
        Math.round(20 + Math.abs(Math.sin(t * 1.1)) * 70),
        Math.round(25 + Math.abs(Math.cos(t * 1.5)) * 72),
        Math.round(18 + Math.abs(Math.sin(t * 1.9)) * 78),
        Math.round(22 + Math.abs(Math.cos(t * 1.3)) * 68),
        Math.round(15 + Math.abs(Math.sin(t * 0.9)) * 65)
      ]);

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

  toggleMute(): void {
    const nextMuted = !this.isMuted();
    this.isMuted.set(nextMuted);
    if (this.audioEl) {
      this.audioEl.muted = nextMuted;
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
    this.jawOpenRatio.set(0);
    this.headNodY.set(0);
    this.headTiltDeg.set(0);
    this.browLiftY.set(0);
    this.activeWordIndex.set(-1);
    this.eqBars.set([14, 18, 15, 20, 14]);
  }

  onScheduleVisit(): void {
    this.scheduleVisitClicked.emit();
  }
}

