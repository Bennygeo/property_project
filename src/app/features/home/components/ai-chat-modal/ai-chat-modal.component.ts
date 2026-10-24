import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AiChatService, AiChatMessage } from '../../../../core/services/ai-chat.service';
import { Property } from '../../../../core/models/property.model';

@Component({
  selector: 'app-ai-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <!-- Floating Bottom-Right Persistent AI Concierge Launcher Badge (shown only when full chat is closed) -->
    @if (!aiService.isChatOpen()) {
      <button 
        type="button" 
        class="ai-floating-trigger" 
        (click)="openFullScreenChat()" 
        id="ai-floating-btn"
        title="Open Find a Plot AI Property Concierge"
        aria-label="Open AI Property Concierge">
        <div class="ai-sparkle-glow"></div>
        <div class="trigger-inner">
          <span class="material-symbols-outlined ai-icon">auto_awesome</span>
          <span class="ai-label">AI Concierge</span>
        </div>
        <span class="online-indicator"></span>
      </button>
    }

    <!-- Full-Screen ChatGPT Experience -->
    @if (aiService.isChatOpen()) {
      <div class="chatgpt-fullscreen-root" role="dialog" aria-modal="true" aria-label="Find a Plot AI Concierge">
        
        <!-- 1. Collapsible Left Sidebar (ChatGPT-style) -->
        <aside class="chatgpt-sidebar" [class.is-collapsed]="!aiService.isSidebarOpen()">
          
          <!-- Sidebar Header: New Chat & Toggle -->
          <div class="sidebar-header">
            <button 
              type="button" 
              class="btn-new-chat" 
              (click)="aiService.startNewChat()"
              title="Start a new chat">
              <span class="material-symbols-outlined icon-add">add</span>
              <span class="label-new-chat">New chat</span>
              <span class="material-symbols-outlined icon-edit">edit_square</span>
            </button>

            <button 
              type="button" 
              class="btn-sidebar-icon" 
              (click)="aiService.toggleSidebar()"
              title="Collapse sidebar"
              aria-label="Collapse sidebar">
              <span class="material-symbols-outlined">dock_to_right</span>
            </button>
          </div>

          <!-- Conversation Sessions History Scroll -->
          <div class="sidebar-history-scroll">
            <div class="history-label">Recent Conversations</div>

            @for (session of aiService.sessions(); track session.id) {
              <div 
                class="history-item"
                [class.active]="aiService.currentSessionId() === session.id"
                (click)="aiService.selectSession(session.id)">
                <span class="material-symbols-outlined history-icon">chat_bubble_outline</span>
                <span class="history-title" [title]="session.title">{{ session.title }}</span>
                
                <button 
                  type="button" 
                  class="btn-delete-session" 
                  (click)="aiService.deleteSession(session.id, $event)"
                  title="Delete chat"
                  aria-label="Delete chat">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            }
          </div>

          <!-- Sidebar Footer: Marketplace Navigation -->
          <div class="sidebar-footer">
            <button 
              type="button" 
              class="btn-back-marketplace" 
              (click)="closeFullScreenChat()"
              title="Exit and return to Find a Plot marketplace">
              <span class="material-symbols-outlined">arrow_back</span>
              <div class="back-text">
                <span class="back-title">Find a Plot</span>
                <span class="back-sub">Back to Marketplace</span>
              </div>
            </button>
          </div>
        </aside>

        <!-- 2. Main Chat Canvas (Full Viewport) -->
        <main class="chatgpt-main-view">
          
          <!-- Top Navigation Bar -->
          <header class="chatgpt-topbar">
            <div class="topbar-left">
              @if (!aiService.isSidebarOpen()) {
                <button 
                  type="button" 
                  class="btn-topbar-sidebar-toggle" 
                  (click)="aiService.toggleSidebar()"
                  title="Open sidebar"
                  aria-label="Open sidebar">
                  <span class="material-symbols-outlined">dock_to_right</span>
                </button>
              }

              <!-- Model Selector Pill -->
              <div class="model-selector-pill" title="Model: Find a Plot AI 4.0 Cadastral & Survey Intel">
                <span class="model-title">Find a Plot AI 4.0</span>
                <span class="model-badge">Cadastral Intel</span>
                <span class="material-symbols-outlined model-chevron">expand_more</span>
              </div>
            </div>

            <div class="topbar-right">
              <button 
                type="button" 
                class="btn-topbar-close" 
                (click)="closeFullScreenChat()" 
                title="Close AI chat (Esc)"
                aria-label="Close AI chat">
                <span class="material-symbols-outlined">close</span>
                <span class="esc-hint">Esc</span>
              </button>
            </div>
          </header>

          <!-- Chat Conversation Scroll Stream -->
          <div class="chatgpt-scroll-area" #scrollContainer>
            <div class="chatgpt-stream-container">
              
              <!-- Greeting Hero (Displayed when conversation is fresh) -->
              @if (isNewConversation()) {
                <div class="chatgpt-hero-greeting">
                  <div class="greeting-avatar">
                    <span class="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <h1 class="greeting-title">What plot or property can I find for you?</h1>
                  <p class="greeting-subtitle">
                    Explore survey-audited plots with 4K drone views, inspect verified buyer demands, or list your land for free without broker fees.
                  </p>

                  <!-- 4 Instant Starter Prompt Cards in 2x2 Grid -->
                  <div class="starter-cards-grid">
                    @for (starter of starterPrompts; track starter.title) {
                      <div class="starter-card" (click)="onChipClick(starter.prompt)">
                        <div class="starter-content">
                          <span class="starter-card-title">{{ starter.title }}</span>
                          <span class="starter-card-desc">{{ starter.desc }}</span>
                        </div>
                        <span class="material-symbols-outlined starter-icon">arrow_outward</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Messages List -->
              @for (msg of aiService.messages(); track msg.id) {
                <div 
                  class="chat-turn-row" 
                  [class.is-user]="msg.sender === 'user'" 
                  [class.is-assistant]="msg.sender === 'assistant'">
                  
                  @if (msg.sender === 'assistant') {
                    <div class="turn-avatar assistant-avatar">
                      <span class="material-symbols-outlined">smart_toy</span>
                    </div>
                  }

                  <div class="turn-content-col">
                    <div class="turn-sender-header">
                      {{ msg.sender === 'user' ? 'You' : 'Find a Plot AI' }}
                    </div>

                    <div class="turn-bubble" [class.user-bubble]="msg.sender === 'user'" [class.assistant-bubble]="msg.sender === 'assistant'">
                      <div class="formatted-text" [innerHTML]="formatMarkdown(msg.text)"></div>
                    </div>

                    <!-- Recommended Properties Grid -->
                    @if (msg.recommendedProperties && msg.recommendedProperties.length > 0) {
                      <div class="recommended-cards-grid">
                        @for (prop of msg.recommendedProperties; track prop.id) {
                          <div class="ai-property-card" (click)="viewProperty(prop.id)">
                            <div class="prop-thumb-frame">
                              <img [src]="prop.imageUrl || 'hero-bg.jpg'" [alt]="prop.title" class="prop-thumb-img" loading="lazy" />
                              <span class="prop-type-pill">{{ prop.propertyType }}</span>
                            </div>
                            <div class="prop-card-body">
                              <div class="prop-card-price">{{ prop.price }}</div>
                              <h4 class="prop-card-title" [title]="prop.title">{{ prop.title }}</h4>
                              <div class="prop-card-loc">
                                <span class="material-symbols-outlined pin-icon">location_on</span>
                                <span>{{ prop.locality }}, {{ prop.city }}</span>
                              </div>
                              <div class="prop-card-cta">
                                <span>Inspect Drone Tour &amp; Deeds &rarr;</span>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }

                    <!-- Action CTA Button -->
                    @if (msg.actionCta) {
                      <div class="action-cta-wrap">
                        <button 
                          type="button" 
                          class="btn-action-cta" 
                          (click)="handleAction(msg.actionCta)">
                          <span>{{ msg.actionCta.label }}</span>
                        </button>
                      </div>
                    }

                    <!-- Suggested Follow-Up Chips -->
                    @if (msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0) {
                      <div class="followup-chips-wrap">
                        @for (chip of msg.suggestedFollowUps; track chip) {
                          <button 
                            type="button" 
                            class="followup-chip-pill" 
                            (click)="onChipClick(chip)">
                            <span>{{ chip }}</span>
                            <span class="material-symbols-outlined">arrow_upward</span>
                          </button>
                        }
                      </div>
                    }

                  </div>

                  @if (msg.sender === 'user') {
                    <div class="turn-avatar user-avatar">
                      <span class="material-symbols-outlined">person</span>
                    </div>
                  }
                </div>
              }

              <!-- Typing Animation Indicator -->
              @if (aiService.isTyping()) {
                <div class="chat-turn-row is-assistant">
                  <div class="turn-avatar assistant-avatar">
                    <span class="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div class="typing-bubble">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                  </div>
                </div>
              }

            </div>
          </div>

          <!-- 3. Bottom Docked Input Capsule (Iconic ChatGPT style) -->
          <footer class="chatgpt-bottom-dock">
            <div class="dock-container">
              
              <!-- Quick Suggestions Strip -->
              <div class="quick-suggestions-strip">
                @for (prompt of aiService.quickSuggestions; track prompt) {
                  <button 
                    type="button" 
                    class="quick-pill-button" 
                    (click)="onChipClick(prompt)">
                    {{ prompt }}
                  </button>
                }
              </div>

              <!-- Rounded Input Capsule -->
              <div class="input-capsule">
                <form class="input-form-inner" (submit)="$event.preventDefault(); submitMessage()">
                  <textarea 
                    #messageInput
                    class="chatgpt-textarea" 
                    rows="1"
                    placeholder="Message Find a Plot AI Concierge..."
                    [ngModel]="currentInput()" 
                    (ngModelChange)="currentInput.set($event)"
                    (keydown)="onTextareaKeydown($event)"
                    name="userMessage"
                    autocomplete="off"></textarea>

                  <button 
                    type="submit" 
                    class="btn-send-capsule" 
                    [disabled]="!currentInput().trim() || aiService.isTyping()"
                    title="Send message"
                    aria-label="Send message">
                    <span class="material-symbols-outlined">arrow_upward</span>
                  </button>
                </form>
              </div>

              <div class="dock-disclaimer">
                Find a Plot AI Concierge provides verified survey &amp; cadastral intelligence. Zero brokerage, 100% direct owner deeds.
              </div>

            </div>
          </footer>

        </main>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Floating Launcher Badge (Bottom-Right) */
    .ai-floating-trigger {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 9999px;
      border: 1px solid rgba(94, 143, 114, 0.25);
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      box-shadow: none;
      cursor: pointer;
      user-select: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-floating-trigger:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: none;
      border-color: rgba(94, 143, 114, 0.6);
    }
    .trigger-inner {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .ai-icon {
      font-size: 19px;
      color: #f87171;
    }
    .ai-label {
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .online-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #22c55e;
      box-shadow: none;
    }

    /* ==========================================================================
       FULL-SCREEN CHATGPT LAYOUT
       ========================================================================== */
    .chatgpt-fullscreen-root {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 99999;
      display: flex;
      background: #ffffff;
      color: #0f172a;
      overflow: hidden;
      font-family: inherit;
      animation: chatgptFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes chatgptFadeIn {
      from {
        opacity: 0;
        transform: scale(0.99);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* --------------------------------------------------------------------------
       COLLAPSIBLE SIDEBAR
       -------------------------------------------------------------------------- */
    .chatgpt-sidebar {
      width: 260px;
      height: 100%;
      background: #f9fafb;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      z-index: 50;
    }
    .chatgpt-sidebar.is-collapsed {
      width: 0;
      margin-left: -260px;
      border-right: none;
    }

    .sidebar-header {
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .btn-new-chat {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 9px 12px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #0f172a;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: none;
      transition: all 0.15s ease;
    }
    .btn-new-chat:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    .btn-new-chat .icon-add {
      font-size: 18px;
      color: #0f3b4a;
    }
    .btn-new-chat .icon-edit {
      font-size: 16px;
      color: #9ca3af;
    }
    .btn-sidebar-icon {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-sidebar-icon:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .sidebar-history-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .history-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      padding: 8px 8px 4px;
    }
    .history-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      color: #334155;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      position: relative;
      transition: background 0.15s ease, color 0.15s ease;
      user-select: none;
    }
    .history-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .history-item.active {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 600;
    }
    .history-icon {
      font-size: 17px;
      color: #94a3b8;
      flex-shrink: 0;
    }
    .history-title {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-delete-session {
      display: none;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 2px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }
    .btn-delete-session:hover {
      color: #ef4444;
    }
    .btn-delete-session span {
      font-size: 16px;
    }
    .history-item:hover .btn-delete-session {
      display: flex;
    }

    .sidebar-footer {
      padding: 12px 14px;
      border-top: 1px solid #e5e7eb;
      background: #ffffff;
      flex-shrink: 0;
    }
    .btn-back-marketplace {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #0f172a;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
    }
    .btn-back-marketplace:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .back-text {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }
    .back-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f3b4a;
    }
    .back-sub {
      font-size: 11px;
      color: #64748b;
    }

    /* --------------------------------------------------------------------------
       MAIN CHAT CANVAS
       -------------------------------------------------------------------------- */
    .chatgpt-main-view {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      position: relative;
      min-width: 0;
      overflow: hidden;
    }

    /* Top Bar */
    .chatgpt-topbar {
      height: 56px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.25rem;
      background: #ffffff;
      flex-shrink: 0;
      z-index: 20;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-topbar-sidebar-toggle {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-topbar-sidebar-toggle:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .model-selector-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      cursor: default;
      user-select: none;
    }
    .model-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .model-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .model-chevron {
      font-size: 18px;
      color: #94a3b8;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-topbar-close {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: #0f172a;
      border: 1px solid #0f172a;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-topbar-close:hover {
      background: #1e293b;
    }
    .btn-topbar-close span {
      font-size: 17px;
    }
    .esc-hint {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.2);
      font-family: ui-monospace, monospace;
      letter-spacing: 0.05em;
    }

    /* --------------------------------------------------------------------------
       CHAT MESSAGES SCROLL STREAM (Centered Column)
       -------------------------------------------------------------------------- */
    .chatgpt-scroll-area {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      scroll-behavior: smooth;
    }
    .chatgpt-stream-container {
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 10rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      flex: 1;
    }

    /* Greeting Hero */
    .chatgpt-hero-greeting {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem 1rem 1.5rem;
      max-width: 680px;
      margin: 0 auto;
    }
    .greeting-avatar {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #0f3b4a 0%, #1e293b 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      box-shadow: none;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .greeting-avatar span {
      font-size: 28px;
      color: #34d399;
    }
    .greeting-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin: 0 0 0.6rem;
    }
    .greeting-subtitle {
      font-size: 0.95rem;
      color: #64748b;
      line-height: 1.6;
      margin: 0 0 2rem;
    }

    /* 4 Starter Cards Grid */
    .starter-cards-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      width: 100%;
      text-align: left;
    }
    @media (min-width: 640px) {
      .starter-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .starter-card {
      padding: 14px 16px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: none;
    }
    .starter-card:hover {
      border-color: #0f3b4a;
      background: #f8fafc;
      transform: translateY(-1px);
      box-shadow: none;
    }
    .starter-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .starter-card-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .starter-card-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .starter-icon {
      font-size: 18px;
      color: #94a3b8;
      flex-shrink: 0;
      transition: transform 0.15s ease, color 0.15s ease;
    }
    .starter-card:hover .starter-icon {
      color: #0f3b4a;
      transform: translate(2px, -2px);
    }

    /* Chat Turn Rows */
    .chat-turn-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      width: 100%;
    }
    .chat-turn-row.is-user {
      justify-content: flex-end;
    }
    .turn-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .assistant-avatar {
      background: #0f3b4a;
      color: #ffffff;
    }
    .assistant-avatar span {
      font-size: 19px;
      color: #34d399;
    }
    .user-avatar {
      background: #0f172a;
      color: #ffffff;
    }
    .user-avatar span {
      font-size: 20px;
    }

    .turn-content-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 88%;
    }
    .chat-turn-row.is-user .turn-content-col {
      align-items: flex-end;
    }
    .turn-sender-header {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: -0.01em;
    }

    .turn-bubble {
      padding: 12px 18px;
      border-radius: 14px;
      font-size: 14.5px;
      line-height: 1.65;
    }
    .user-bubble {
      background: #0f3b4a;
      color: #ffffff;
      border-top-right-radius: 4px;
    }
    .assistant-bubble {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      border-top-left-radius: 4px;
    }
    .formatted-text {
      word-break: break-word;
    }
    .formatted-text strong {
      font-weight: 700;
      color: inherit;
    }

    /* Recommended Properties Grid */
    .recommended-cards-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 8px;
      width: 100%;
    }
    @media (min-width: 580px) {
      .recommended-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .ai-property-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-property-card:hover {
      border-color: #0f3b4a;
      transform: translateY(-2px);
      box-shadow: none;
    }
    .prop-thumb-frame {
      position: relative;
      height: 120px;
      background: #f1f5f9;
      overflow: hidden;
    }
    .prop-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .prop-type-pill {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 600;
    }
    .prop-card-body {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prop-card-price {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .prop-card-title {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .prop-card-loc {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11.5px;
      color: #64748b;
    }
    .pin-icon {
      font-size: 14px;
      color: #94a3b8;
    }
    .prop-card-cta {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #0f3b4a;
    }

    /* Action CTA */
    .action-cta-wrap {
      margin-top: 6px;
    }
    .btn-action-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      background: #0f3b4a;
      color: #ffffff;
      border: 1px solid #0f3b4a;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-action-cta:hover {
      background: #144f63;
    }

    /* Suggested Followup Chips */
    .followup-chips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .followup-chip-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 12px;
      border-radius: 9999px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .followup-chip-pill:hover {
      background: #f1f5f9;
      color: #0f172a;
      border-color: #94a3b8;
    }
    .followup-chip-pill span {
      font-size: 14px;
      color: #64748b;
    }

    /* Typing Indicator */
    .typing-bubble {
      padding: 12px 18px;
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
      animation: typingWave 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typingWave {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.1); opacity: 1; background: #0f3b4a; }
    }

    /* --------------------------------------------------------------------------
       BOTTOM DOCKED INPUT CAPSULE (ChatGPT Floating Input)
       -------------------------------------------------------------------------- */
    .chatgpt-bottom-dock {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, #ffffff 78%, rgba(255, 255, 255, 0) 100%);
      padding: 0.75rem 1.25rem 1.25rem;
      z-index: 30;
      pointer-events: none;
    }
    .dock-container {
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    /* Quick Suggestions Strip */
    .quick-suggestions-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      width: 100%;
      padding-bottom: 2px;
      scrollbar-width: none;
    }
    .quick-suggestions-strip::-webkit-scrollbar {
      display: none;
    }
    .quick-pill-button {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      border-radius: 9999px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: none;
      transition: all 0.15s ease;
    }
    .quick-pill-button:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
    }

    /* Input Capsule */
    .input-capsule {
      width: 100%;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 28px;
      box-shadow: none;
      padding: 6px 8px 6px 18px;
      transition: border-color 0.2s ease;
    }
    .input-capsule:focus-within {
      border-color: #0f3b4a;
      box-shadow: none;
    }
    .input-form-inner {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .chatgpt-textarea {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-family: inherit;
      font-size: 14.5px;
      line-height: 1.5;
      color: #0f172a;
      resize: none;
      padding: 8px 0;
      max-height: 160px;
    }
    .chatgpt-textarea::placeholder {
      color: #94a3b8;
    }
    .btn-send-capsule {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #0f3b4a;
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }
    .btn-send-capsule:hover:not(:disabled) {
      background: #144f63;
      transform: scale(1.05);
    }
    .btn-send-capsule:disabled {
      background: #e2e8f0;
      color: #94a3b8;
      cursor: not-allowed;
    }
    .btn-send-capsule span {
      font-size: 18px;
      font-weight: 700;
    }

    .dock-disclaimer {
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      letter-spacing: -0.005em;
    }

    /* --------------------------------------------------------------------------
       RESPONSIVE BREAKPOINTS
       -------------------------------------------------------------------------- */
    @media (max-width: 768px) {
      .chatgpt-sidebar {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 100;
        box-shadow: none;
        border-right: 1px solid #cbd5e1;
      }
      .chatgpt-stream-container {
        padding: 1.5rem 1rem 9rem;
      }
      .turn-content-col {
        max-width: 92%;
      }
      .hidden-xs {
        display: none;
      }
    }
  `]
})
export class AiChatModalComponent implements OnInit, AfterViewChecked {
  readonly aiService = inject(AiChatService);
  private readonly router = inject(Router);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly currentInput = signal<string>('');

  readonly starterPrompts = [
    {
      title: 'Find CMDA Plots',
      desc: 'Filter gated layout plots under ₹50 Lakhs with clean title',
      prompt: 'Find CMDA plots under ₹50 Lakhs'
    },
    {
      title: 'List Land for Free',
      desc: 'Direct owner registration without broker fees',
      prompt: 'I want to list my land (Free)'
    },
    {
      title: '4K Drone Surveys',
      desc: 'Browse plots with verified aerial inspection video',
      prompt: 'Plots with 4K drone aerial surveys'
    },
    {
      title: 'Live Buyer Demands',
      desc: 'See active pre-screened cash investor requests',
      prompt: 'Show active buyer requests in Chennai'
    }
  ];

  ngOnInit(): void {
    if (this.router.url.includes('/ai')) {
      this.openFullScreenChat();
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  isNewConversation(): boolean {
    const msgs = this.aiService.messages();
    return msgs.length <= 1 && msgs[0]?.id === 'msg-welcome';
  }

  openFullScreenChat(): void {
    this.aiService.openChat();
  }

  closeFullScreenChat(): void {
    this.aiService.closeChat();
    if (this.router.url.includes('/ai')) {
      this.router.navigate(['/']);
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.aiService.isChatOpen()) {
      this.closeFullScreenChat();
    }
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitMessage();
    }
  }

  submitMessage(): void {
    const text = this.currentInput();
    if (!text.trim()) return;
    this.currentInput.set('');
    this.aiService.sendMessage(text);
  }

  onChipClick(promptText: string): void {
    this.aiService.sendMessage(promptText);
  }

  viewProperty(propId: string): void {
    this.closeFullScreenChat();
    this.router.navigate(['/property', propId]);
  }

  handleAction(actionCta: NonNullable<AiChatMessage['actionCta']>): void {
    this.closeFullScreenChat();
    if (actionCta.route) {
      this.router.navigate([actionCta.route], { queryParams: actionCta.queryParams });
    }
  }

  formatMarkdown(text: string): string {
    if (!text) return '';
    return text
      .replace(/^### (.*$)/gim, '<h4 style="font-size:14px;font-weight:700;color:#0f172a;margin:4px 0 6px;">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }
}
