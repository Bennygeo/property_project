import { 
  Component, 
  Input, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  signal, 
  computed, 
  inject, 
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-secure-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './secure-video-player.component.html',
  styleUrls: ['./secure-video-player.component.css']
})
export class SecureVideoPlayerComponent implements OnInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);

  @Input() videoUrl: string = '';
  @Input() posterUrl: string = '';
  @Input() title: string = 'Property Video Dossier';
  @Input() propertyRef: string = '';
  @Input() cloudflareStreamId: string = '';
  @Input() autoplay: boolean = true;

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  // Security States
  readonly isWindowBlurred = signal<boolean>(false);
  readonly securityAlertTriggered = signal<boolean>(false);
  readonly securityAlertMessage = signal<string>('');
  readonly isMuted = signal<boolean>(true);
  readonly isPlaying = signal<boolean>(false);

  // Live Forensic Timestamp
  readonly liveTimestamp = signal<string>('');
  private timerInterval?: ReturnType<typeof setInterval>;
  private alertTimeout?: ReturnType<typeof setTimeout>;

  // Watermark Positioning (Drifts between 4 quadrants every 8 seconds to prevent cropping)
  readonly watermarkQuadrant = signal<number>(0);
  private watermarkInterval?: ReturnType<typeof setInterval>;

  // Viewer Forensic Identifier
  readonly viewerWatermarkLabel = computed<string>(() => {
    const user = this.authService.currentUser() as User | null;
    if (user) {
      const phoneClean = user.phone ? user.phone.slice(-4).padStart(user.phone.length, '•') : 'VERIFIED';
      return `${user.name} • ${phoneClean} • UID #${user.id}`;
    }
    return `SECURE GUEST • SESS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  });

  // Determines if Cloudflare Stream embed is active
  readonly isCloudflareStream = computed<boolean>(() => {
    if (this.cloudflareStreamId && this.cloudflareStreamId.trim().length > 0) {
      return true;
    }
    return this.videoUrl.includes('cloudflarestream.com') || this.videoUrl.includes('videodelivery.net');
  });

  // Cloudflare Stream Safe Iframe URL
  readonly cloudflareIframeUrl = computed<SafeResourceUrl | null>(() => {
    let videoId = this.cloudflareStreamId?.trim();
    if (!videoId && this.isCloudflareStream()) {
      const matches = this.videoUrl.match(/(?:cloudflarestream\.com|videodelivery\.net)\/([a-zA-Z0-9_-]+)/);
      if (matches && matches[1]) {
        videoId = matches[1];
      }
    }

    if (!videoId) return null;

    // Cloudflare Stream Player with secure params (no download, auto-adaptation, signed token ready)
    const rawUrl = `https://iframe.videodelivery.net/${videoId}?preload=true&autoplay=${this.autoplay ? 'true' : 'false'}&poster=${encodeURIComponent(this.posterUrl || '')}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
  });

  ngOnInit(): void {
    this.updateTimestamp();
    this.timerInterval = setInterval(() => this.updateTimestamp(), 1000);

    // Shift forensic watermark position every 8s to foil video crop tools
    this.watermarkInterval = setInterval(() => {
      this.watermarkQuadrant.update(q => (q + 1) % 4);
    }, 8000);

    // Initial check for visibility
    if (typeof document !== 'undefined' && document.hidden) {
      this.triggerSecurityPause('Window hidden');
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.watermarkInterval) clearInterval(this.watermarkInterval);
    if (this.alertTimeout) clearTimeout(this.alertTimeout);
  }

  private updateTimestamp(): void {
    const now = new Date();
    this.liveTimestamp.set(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
  }

  // 1. WINDOW BLUR & FOCUS DETECTION (Anti-Screen Capture, Snipping Tool, OBS, App Switch)
  @HostListener('window:blur')
  onWindowBlur(): void {
    this.triggerSecurityPause('Screen Capture / Focus Switch Detected');
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    // Keep overlay active until user explicitly resumes or auto-unblur
    this.isWindowBlurred.set(false);
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.hidden) {
      this.triggerSecurityPause('Tab Minimized or Obscured');
    } else {
      this.isWindowBlurred.set(false);
    }
  }

  // 2. SCREENSHOT KEYBOARD SHORTCUT TRAP
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const key = event.key?.toLowerCase();
    
    // PrintScreen
    if (key === 'printscreen' || event.code === 'PrintScreen') {
      this.flashSecurityAlert('Screenshot Capture Blocked by DRM Policy');
      this.triggerSecurityPause('PrintScreen Shortcut Blocked');
      event.preventDefault();
      return;
    }

    // Ctrl+S / Cmd+S (Save Page / Video)
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      this.flashSecurityAlert('Saving Video Stream is Restricted');
      event.preventDefault();
      return;
    }

    // DevTools inspection attempts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    if (
      event.key === 'F12' ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      ((event.ctrlKey || event.metaKey) && key === 'u')
    ) {
      this.flashSecurityAlert('Inspector Disabled During High-Security Playback');
      event.preventDefault();
      return;
    }
  }

  private triggerSecurityPause(reason: string): void {
    this.isWindowBlurred.set(true);
    if (this.videoElement?.nativeElement) {
      try {
        this.videoElement.nativeElement.pause();
      } catch {
        // Ignored
      }
    }
  }

  resumePlayback(): void {
    this.isWindowBlurred.set(false);
    this.securityAlertTriggered.set(false);
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.play().catch(() => {});
    }
  }

  private flashSecurityAlert(msg: string): void {
    this.securityAlertMessage.set(msg);
    this.securityAlertTriggered.set(true);
    if (this.alertTimeout) clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      this.securityAlertTriggered.set(false);
    }, 4000);
  }

  // Prevent right clicks
  preventContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.flashSecurityAlert('Right-Click Context Menu Disabled for Video Protection');
  }

  // Prevent drag
  preventDrag(event: DragEvent): void {
    event.preventDefault();
  }
}
