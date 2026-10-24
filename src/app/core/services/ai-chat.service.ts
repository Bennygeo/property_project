import { Injectable, inject, signal } from '@angular/core';
import { PropertyService } from './property.service';
import { Property } from '../models/property.model';
import { Router } from '@angular/router';

export interface AiChatMessage {
  id: string;
  sender: 'assistant' | 'user' | 'system';
  text: string;
  timestamp: Date;
  recommendedProperties?: Property[];
  actionCta?: {
    label: string;
    route?: string;
    queryParams?: any;
    action?: 'post_property' | 'view_demands' | 'open_search';
  };
  suggestedFollowUps?: string[];
}

export interface AiChatSession {
  id: string;
  title: string;
  timeLabel: 'Today' | 'Previous 7 Days' | 'Previous 30 Days';
  messages: AiChatMessage[];
}

function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0;
  const clean = priceStr.replace(/₹|,/g, '').trim().toLowerCase();
  if (clean.includes('cr')) {
    const num = parseFloat(clean.replace('cr', '').trim());
    return isNaN(num) ? 0 : Math.round(num * 10000000);
  }
  if (clean.includes('lakh') || clean.includes('l')) {
    const num = parseFloat(clean.replace(/lakh|l/g, '').trim());
    return isNaN(num) ? 0 : Math.round(num * 100000);
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : direct;
}

function detectBudgetRange(query: string): { min?: number; max?: number; label: string } | null {
  const q = query.toLowerCase().replace(/,/g, '').trim();

  // 1. Shorthand: "1cr - 2cr", "1cr-2cr", "1 cr - 2 cr", "1 to 2 cr", "1-2 cr", "1 to 2 crore", "1cr to 2cr"
  if ((q.includes('1cr') || q.includes('1 cr') || q.includes('1 crore') || q.includes('1.5cr')) &&
      (q.includes('2cr') || q.includes('2 cr') || q.includes('2 crore') || q.includes('- 2') || q.includes('to 2') || q.includes('-2'))) {
    return { min: 10000000, max: 20000000, label: '₹1 Cr – ₹2 Cr' };
  }

  // 2. Range regex: e.g. "50l - 1cr", "2cr - 5cr", "1cr - 3cr", "50 lakhs to 1 crore"
  const rangeMatch = q.match(/(?:between\s+)?(?:₹\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh)?\s*(?:-|–|to|and)\s*(?:₹\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh)/i);
  if (rangeMatch) {
    const num1 = parseFloat(rangeMatch[1]);
    const unit1 = rangeMatch[2]?.toLowerCase() || rangeMatch[4]?.toLowerCase();
    const num2 = parseFloat(rangeMatch[3]);
    const unit2 = rangeMatch[4]?.toLowerCase();

    const mult1 = (unit1 && (unit1.includes('cr') || unit1.includes('crore'))) ? 10000000 : 100000;
    const mult2 = (unit2 && (unit2.includes('cr') || unit2.includes('crore'))) ? 10000000 : 100000;

    const min = Math.min(num1 * mult1, num2 * mult2);
    const max = Math.max(num1 * mult1, num2 * mult2);
    return { 
      min, 
      max, 
      label: `₹${min >= 10000000 ? (min / 10000000) + ' Cr' : (min / 100000) + ' Lakhs'} – ₹${max >= 10000000 ? (max / 10000000) + ' Cr' : (max / 100000) + ' Lakhs'}` 
    };
  }

  // 3. Under / Below / Less than
  const underMatch = q.match(/(?:under|below|less\s+than|<|upto)\s*(?:₹\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh|lakhs)?/i);
  if (underMatch) {
    const val = parseFloat(underMatch[1]);
    const unit = underMatch[2]?.toLowerCase() || (val <= 10 ? 'cr' : 'l');
    const mult = (unit.includes('cr') || unit.includes('crore')) ? 10000000 : 100000;
    const max = val * mult;
    return { 
      min: 0, 
      max, 
      label: `Under ₹${max >= 10000000 ? (max / 10000000) + ' Cr' : (max / 100000) + ' Lakhs'}` 
    };
  }

  // 4. Above / More than
  const aboveMatch = q.match(/(?:above|more\s+than|>|min)\s*(?:₹\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|l|lakh|lakhs)?/i);
  if (aboveMatch) {
    const val = parseFloat(aboveMatch[1]);
    const unit = aboveMatch[2]?.toLowerCase() || (val <= 10 ? 'cr' : 'l');
    const mult = (unit.includes('cr') || unit.includes('crore')) ? 10000000 : 100000;
    const min = val * mult;
    return { 
      min, 
      label: `Above ₹${min >= 10000000 ? (min / 10000000) + ' Cr' : (min / 100000) + ' Lakhs'}` 
    };
  }

  // 5. 50 lakh / 50l
  if (q.includes('50 lakh') || q.includes('50l') || q.includes('50 l') || q.includes('50lakh')) {
    return { min: 0, max: 5000000, label: 'Under ₹50 Lakhs' };
  }

  // 6. 1 crore / 1cr
  if (q.includes('1 crore') || q.includes('1cr') || q.includes('1 cr')) {
    return { min: 0, max: 10000000, label: 'Under ₹1 Crore' };
  }

  return null;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly propertyService = inject(PropertyService);
  private readonly router = inject(Router);

  // Full-page ChatGPT View State
  readonly isChatOpen = signal<boolean>(false);
  readonly isTyping = signal<boolean>(false);
  readonly isSidebarOpen = signal<boolean>(true);

  // Initial welcome message for fresh chats
  private readonly defaultWelcomeMessage: AiChatMessage = {
    id: 'msg-welcome',
    sender: 'assistant',
    text: `Hello! I am your **Find a Plot AI Concierge**.\n\nI can help you **search survey-audited plots & homes** with 4K drone walkthroughs, inspect **verified buyer demands**, or guide you to **list your land for free** without broker middlemen.\n\nHow can I assist you today?`,
    timestamp: new Date(),
    suggestedFollowUps: [
      'Find CMDA plots under ₹50 Lakhs',
      'I want to list my land (Free)',
      'Show active buyer requests in Chennai',
      'Plots with 4K drone aerial surveys'
    ]
  };

  // Chat Sessions List
  readonly sessions = signal<AiChatSession[]>([
    {
      id: 'session-cmda-vandalur',
      title: 'CMDA Plots in Vandalur (₹45L)',
      timeLabel: 'Today',
      messages: [
        {
          id: 's1-u1',
          sender: 'user',
          text: 'Find CMDA plots in Vandalur under ₹50 Lakhs',
          timestamp: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
          id: 's1-a1',
          sender: 'assistant',
          text: `I found **2 verified cadastral listings** in the Vandalur–Guduvanchery corridor with clean title deeds and CMDA sanction:`,
          timestamp: new Date(Date.now() - 1000 * 60 * 29),
          actionCta: {
            label: 'View Full Search Results Directory →',
            route: '/search',
            queryParams: { type: 'Gated CMDA Plots' }
          },
          suggestedFollowUps: [
            'Filter plots with 4K drone video',
            'Check 30-year encumbrance status',
            'What is the road width?'
          ]
        }
      ]
    },
    {
      id: 'session-chengalpattu-farm',
      title: 'Chengalpattu Farmland 2 Acres',
      timeLabel: 'Previous 7 Days',
      messages: [
        {
          id: 's2-u1',
          sender: 'user',
          text: 'Show agricultural and farm land near Chengalpattu with clear Patta',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
        },
        {
          id: 's2-a1',
          sender: 'assistant',
          text: `### 🌾 Fertile Managed Farm & Agro Acreage\n\nFound multiple managed farmland parcels near Madurantakam–Chengalpattu with sweet groundwater and verified single-owner Patta records.`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          suggestedFollowUps: [
            'Is groundwater potable?',
            'Check boundary stone demarcation'
          ]
        }
      ]
    },
    {
      id: 'session-omr-listing',
      title: 'Direct Owner Listing - OMR',
      timeLabel: 'Previous 7 Days',
      messages: [
        {
          id: 's3-u1',
          sender: 'user',
          text: 'How can I post my 2400 sq.ft plot in OMR without broker charges?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4)
        },
        {
          id: 's3-a1',
          sender: 'assistant',
          text: `### 📋 Direct Owner Registry Intake\n\nListing your land on **Find a Plot** is 100% free for direct owners. We never charge brokerage or seller commissions. All you need is your survey number and asking price.`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
          actionCta: {
            label: 'Start Free Owner Listing →',
            route: '/post-property'
          }
        }
      ]
    },
    {
      id: 'session-buyer-demands',
      title: 'Active Buyer Demands',
      timeLabel: 'Previous 30 Days',
      messages: [
        {
          id: 's4-u1',
          sender: 'user',
          text: 'What buyer requests are active right now?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12)
        },
        {
          id: 's4-a1',
          sender: 'assistant',
          text: `### 🎯 Live Pre-Screened Buyer Demands\n\nWe currently have pre-screened cash investors looking for:\n• **Gated Villa Plot (1,800-2,400 sq.ft)**: Vandalur (Budget ₹42L-₹60L)\n• **Agro Acreage (1-3 Acres)**: Chengalpattu Road (Budget ₹75L-₹1.4Cr)\n• **Highway Frontage**: OMR Navalur (Budget ₹2.5Cr-₹6Cr)`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12)
        }
      ]
    }
  ]);

  // Current Active Session ID
  readonly currentSessionId = signal<string>('session-new');

  // Active messages signal
  readonly messages = signal<AiChatMessage[]>([this.defaultWelcomeMessage]);

  readonly quickSuggestions = [
    'Find CMDA plots under ₹50 Lakhs',
    'List my property for free',
    'Show properties in Chennai',
    'What buyer requests are active?'
  ];

  openChat(initialPrompt?: string): void {
    this.isChatOpen.set(true);
    document.body.style.overflow = 'hidden';
    if (initialPrompt) {
      this.sendMessage(initialPrompt);
    }
  }

  closeChat(): void {
    this.isChatOpen.set(false);
    document.body.style.overflow = '';
  }

  toggleChat(): void {
    if (this.isChatOpen()) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  startNewChat(): void {
    const newId = 'session-' + Date.now();
    this.currentSessionId.set(newId);
    this.messages.set([
      {
        id: 'msg-' + Date.now(),
        sender: 'assistant',
        text: `Hello! I am your **Find a Plot AI Concierge**.\n\nI can help you **search survey-audited plots & homes** with 4K drone walkthroughs, inspect **verified buyer demands**, or guide you to **list your land for free** without broker middlemen.\n\nHow can I assist you today?`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'I want to list my land (Free)',
          'Show active buyer requests in Chennai',
          'Plots with 4K drone aerial surveys'
        ]
      }
    ]);
  }

  selectSession(sessionId: string): void {
    const session = this.sessions().find(s => s.id === sessionId);
    if (session) {
      this.currentSessionId.set(session.id);
      this.messages.set([...session.messages]);
    }
  }

  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    this.sessions.update(sessions => sessions.filter(s => s.id !== sessionId));
    if (this.currentSessionId() === sessionId) {
      this.startNewChat();
    }
  }

  resetChat(): void {
    this.startNewChat();
  }

  async sendMessage(userText: string): Promise<void> {
    const trimmed = userText.trim();
    if (!trimmed) return;

    // 1. Append user message
    const userMsg: AiChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMsg]);

    // If active session is new or not in sessions list, register it
    const activeId = this.currentSessionId();
    const existingIndex = this.sessions().findIndex(s => s.id === activeId);

    if (existingIndex === -1) {
      const title = trimmed.length > 32 ? trimmed.substring(0, 32) + '...' : trimmed;
      const newSession: AiChatSession = {
        id: activeId,
        title,
        timeLabel: 'Today',
        messages: this.messages()
      };
      this.sessions.update(prev => [newSession, ...prev]);
    }

    // 2. Set typing state
    this.isTyping.set(true);

    // 3. Process natural language query
    setTimeout(() => {
      const response = this.generateAiResponse(trimmed);
      this.messages.update(msgs => [...msgs, response]);

      // Update stored session messages
      this.sessions.update(sessions =>
        sessions.map(s => s.id === activeId ? { ...s, messages: this.messages() } : s)
      );

      this.isTyping.set(false);
    }, 600);
  }

  private generateAiResponse(query: string): AiChatMessage {
    const raw = query.trim();
    const q = raw.toLowerCase();
    const cleanTokens = q.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    const allProps = this.propertyService.properties();

    // -------------------------------------------------------------
    // INTENT 0: GREETINGS & CASUAL OPENERS ("hi", "hello", "hey", etc.)
    // -------------------------------------------------------------
    const greetingWords = ['hi', 'hello', 'hey', 'heyy', 'namaste', 'vanakkam', 'howdy', 'yo', 'sup', 'hola'];
    const isExactGreeting = cleanTokens.length <= 3 && cleanTokens.some(t => greetingWords.includes(t));
    const isPhraseGreeting = (
      q.startsWith('good morning') || 
      q.startsWith('good afternoon') || 
      q.startsWith('good evening') || 
      q.includes('greetings') || 
      q === 'hello there' ||
      q === 'hi there'
    );

    if (isExactGreeting || isPhraseGreeting) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `Hello! 👋 Welcome to **Find a Plot**.\n\nI am your **AI Property Concierge**, dedicated to making land and home buying transparent, verified, and 100% broker-free.\n\nHere is how I can assist you right now:\n• **Explore Verified Plots & Homes**: Search by locality (*Vandalur, OMR, Chengalpattu, Jubilee Hills*), property type, or budget.\n• **Cadastral & Drone Surveys**: Learn about our 4-eyes survey audits, boundary stones, and 4K aerial tours.\n• **Free Direct-Owner Listings**: Post your land in minutes with zero commission.\n• **Active Buyer Demands**: Check verified investor requirements looking to buy today.\n\nHow can I help you today?`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show properties in Chennai',
          'List my land for free',
          'What buyer demands are active?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 1: WELL-BEING & STATUS ("how are you", "how r u", etc.)
    // -------------------------------------------------------------
    if (
      q.includes('how are you') || 
      q.includes('how r u') || 
      q.includes('how do you do') || 
      q.includes("how's it going") || 
      q.includes('hows it going') ||
      q.includes('how are things')
    ) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `I'm doing great, thank you for asking! 😊\n\nI'm active and ready to assist you with anything regarding our verified land registry. Whether you are looking to buy a verified plot in Chennai, check cadastral boundary records, or list your property directly without broker fees, I'm at your service.\n\nHow is your property search going today?`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show properties in Chennai',
          'How does 4K drone survey work?',
          'I want to list my land'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 2: BOT IDENTITY & CAPABILITIES ("who are you", "what can you do", "help")
    // -------------------------------------------------------------
    if (
      q.includes('who are you') || 
      q.includes('what are you') || 
      q.includes('what can you do') || 
      q.includes('your name') || 
      q.includes('what is find a plot') ||
      q.includes('tell me about yourself') ||
      q.includes('what do you do') ||
      q === 'help' ||
      q === 'help me' ||
      q === 'what is this'
    ) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 🤖 Find a Plot AI Concierge\n\nI am your dedicated AI assistant on **Find a Plot**, the transparent, cadastral-verified property marketplace for South India.\n\n**Here is what I can do for you:**\n1. **Smart Property Search**: Search plots and homes by budget (*e.g. "under ₹50 Lakhs"* or *"₹1 Cr - ₹2 Cr"*), locality (*e.g. Vandalur, OMR, Jubilee Hills*), or approval type (*CMDA, DTCP, RERA*).\n2. **Cadastral & Legal Assistance**: Explain Patta/Chitta, 30-year Encumbrance Certificates (EC), and boundary demarcation.\n3. **100% Free Owner Listings**: Guide direct owners to post land with zero broker commission.\n4. **Verified Buyer Demands**: Share pre-screened investor requirements ready for immediate registration.\n\nWhat would you like to explore today?`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show verified listings in Chennai',
          'What is Patta and Chitta?',
          'How to post my land for free'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 3: GRATITUDE & POLITE CLOSING ("thank you", "thanks", "ok", "bye")
    // -------------------------------------------------------------
    if (
      cleanTokens.includes('thanks') || 
      cleanTokens.includes('thank') || 
      cleanTokens.includes('thx') || 
      q.includes('thank you') || 
      q.includes('appreciate it') ||
      (cleanTokens.length <= 2 && (cleanTokens.includes('ok') || cleanTokens.includes('okay') || cleanTokens.includes('cool') || cleanTokens.includes('awesome') || cleanTokens.includes('great') || cleanTokens.includes('nice') || cleanTokens.includes('perfect') || cleanTokens.includes('sure') || cleanTokens.includes('got it') || cleanTokens.includes('understood')))
    ) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `You're very welcome! 😊\n\nIf you need anything else—like inspecting survey boundaries, finding properties within your budget, or checking cadastral details—I'm right here. Happy land hunting! 🏡`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show properties in Chennai',
          'Show active buyer requests'
        ]
      };
    }

    if (
      cleanTokens.includes('bye') || 
      cleanTokens.includes('goodbye') || 
      q.includes('see you') || 
      q.includes('take care') ||
      q.includes('good night')
    ) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `Goodbye! Have a great day, and best of luck with your land and home search. Whenever you need verified cadastral data or direct owner listings, I'll be here! 👋`,
        timestamp: new Date()
      };
    }

    // -------------------------------------------------------------
    // INTENT 4: HUMOR & LIGHTHEARTED QUERIES ("tell me a joke", "funny")
    // -------------------------------------------------------------
    if (q.includes('joke') || q.includes('funny') || q.includes('humor') || q.includes('laugh')) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `Here is a real estate chuckle for you:\n\n*Why do trees make the best land buyers?*\n*Because they have deep roots and they always appreciate in value!* 😄\n\nWhile I love sharing a smile, my real specialty is helping you navigate verified plots, cadastral surveys, and direct-owner deals without broker fees. Looking for any properties in Chennai, Hyderabad, or Bengaluru?`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show properties in Chennai',
          'What buyer demands are active?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 5: REAL ESTATE LEGAL & LAND CONCEPT INQUIRIES
    // -------------------------------------------------------------
    // Patta & Chitta
    if (q.includes('patta') || q.includes('chitta')) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 📜 Understanding Patta & Chitta in Tamil Nadu\n\n• **Patta**: A crucial legal revenue document issued by the Tahsildar establishing legal ownership of a specific parcel of land under the Government revenue records. It contains the Patta Number, District, Taluk, Village, and Survey Number / Subdivision.\n\n• **Chitta**: The extract of the village land revenue register that specifies the classification of land (e.g. *Nanjai* / wetland, *Punjai* / dry land) along with the owner's name and tax assessment.\n\n🛡️ **Find a Plot Standard**: Every plot listed on our platform undergoes automated cadastral verification against the **Anytime/Anywhere e-Services Patta/Chitta portal (eservices.tn.gov.in)** to ensure zero ownership disputes.`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'How does 30-year encumbrance check work?',
          'Show CMDA approved plots with clear Patta',
          'List my land with Patta details'
        ]
      };
    }

    // CMDA vs DTCP / Planning Authorities
    if ((q.includes('cmda') && q.includes('dtcp')) || q.includes('difference between cmda and dtcp') || q.includes('what is cmda') || q.includes('what is dtcp')) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 🏛️ CMDA vs DTCP Approvals Explained\n\n• **CMDA (Chennai Metropolitan Development Authority)**: Governs urban planning and layout approvals specifically within the Chennai Metropolitan Area (CMA)—covering Chennai, parts of Chengalpattu, Kanchipuram, and Tiruvallur districts.\n\n• **DTCP (Directorate of Town and Country Planning)**: Governs layout and developmental permissions for all areas in Tamil Nadu outside the CMDA jurisdiction.\n\n**Key Takeaway**: Both CMDA and DTCP approvals guarantee that the layout has sanctioned roads, open spaces (OSR), and legal building permissions. In addition, RERA registration is mandatory for commercial marketing of approved layouts.`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show DTCP approved plots',
          'What is RERA approval?'
        ]
      };
    }

    // Encumbrance Certificate (EC)
    if (q.includes('encumbrance') || q.includes('ec ') || q.endsWith('ec') || q.includes('villangam') || q.includes('what is ec')) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 🔍 What is an Encumbrance Certificate (EC)?\n\nAn **Encumbrance Certificate (Villangam Chaandridhazh)** is an official record issued by the Sub-Registrar's Office (SRO) reflecting all registered financial liabilities, mortgages, sales, or title transfers registered against a property over a given period.\n\n• **Form 15**: Lists all registered transactions (if any exist) during the period searched.\n• **Form 16 (Nil Encumbrance Certificate)**: Confirms that no adverse claims or mortgages were registered against the property during the specified duration.\n\n🛡️ On **Find a Plot**, our legal audit team mandates a minimum 30-year clean Encumbrance trail before any land is given verified status.`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Show verified CMDA plots in Chennai',
          'How do 4K drone surveys work?',
          'List my property with verified EC'
        ]
      };
    }

    // Guideline Value vs Market Value
    if (q.includes('guideline value') || q.includes('market value') || q.includes('stamp duty')) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 📊 Guideline Value vs. Market Value\n\n• **Guideline Value**: The minimum value fixed by the State Government for a piece of land in a particular street or survey number. Stamp duty and registration charges are calculated based on this (or the sale value, whichever is higher).\n\n• **Market Value**: The actual transacted price agreed upon between the buyer and the seller, influenced by infrastructure, road access, and market demand.\n\n💡 On **Find a Plot**, all prices reflect transparent, direct owner pricing without artificial broker markups.`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show properties in Chennai',
          'List my land for free'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 6: OUT-OF-CONTEXT / GENERAL CONVERSATIONAL INQUIRIES
    // -------------------------------------------------------------
    const isOutofContext = (
      q.startsWith('what is the') ||
      q.startsWith('who is') ||
      q.startsWith('why is') ||
      q.startsWith('how to') ||
      q.startsWith('can you write') ||
      q.startsWith('can you code') ||
      q.includes('weather') ||
      q.includes('movie') ||
      q.includes('song') ||
      q.includes('music') ||
      q.includes('cricket') ||
      q.includes('football') ||
      q.includes('president') ||
      q.includes('prime minister') ||
      q.includes('capital of') ||
      q.includes('recipe') ||
      q.includes('food') ||
      q.includes('restaurant') ||
      q.includes('python') ||
      q.includes('javascript') ||
      q.includes('coding')
    );

    if (isOutofContext) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `That's an interesting question! While my core training is focused as the **Find a Plot AI Concierge**—specializing in cadastral land records, 4K drone surveys, verified plots, and direct owner listings in South India—I'm always happy to converse.\n\nIf you ever have any questions about:\n• **Plots & Land**: Finding CMDA/DTCP layouts or fertile farmlands in Chennai, Bengaluru, or Hyderabad\n• **Title Verifications**: Checking Patta, Chitta, or 30-year Encumbrance records\n• **Direct Selling**: Listing your land for free without broker fees\n\nI'm ready whenever you are! Would you like to explore any verified properties today?`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show properties in Chennai',
          'What is Patta and Chitta?',
          'How to list my land for free'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 7: TEST SEARCH ("test", "benny test", "ezhil test", etc.)
    // -------------------------------------------------------------
    if (q.includes('test')) {
      const testSelection = allProps.filter(p => p.title.toLowerCase().includes('test'));

      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 🧪 Test Verified Listings\n\nI found **${testSelection.length} properties** matching **"test"** in our verified cadastral registry:\n\n• **${testSelection[0]?.title}** (${testSelection[0]?.locality}, ${testSelection[0]?.city}) — **${testSelection[0]?.price}** (${testSelection[0]?.sqft}, ${testSelection[0]?.bhkBadge})\n• **${testSelection[1]?.title}** (${testSelection[1]?.locality}, ${testSelection[1]?.city}) — **${testSelection[1]?.price}** (${testSelection[1]?.sqft}, ${testSelection[1]?.bhkBadge})\n\nBoth listings have verified cadastral boundary surveys and active RERA certifications:`,
        timestamp: new Date(),
        recommendedProperties: testSelection,
        actionCta: {
          label: 'View Test Properties in Search Directory →',
          route: '/search',
          queryParams: { q: 'test' }
        },
        suggestedFollowUps: [
          'Inspect Benny test deed',
          'Inspect Ezhil test deed',
          'Show properties in Chennai'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 8: SELLER / LISTING INTENT
    // -------------------------------------------------------------
    if (
      q.includes('list') || 
      q.includes('sell') || 
      q.includes('post') || 
      q.includes('my land') || 
      q.includes('owner') ||
      q.includes('upload')
    ) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 📋 List Your Property (100% Free for Direct Owners)\n\nWe connect you directly with pre-screened investors without spam broker calls or brokerage fees.\n\n**To list your land, you just need:**\n1. Locality & City (e.g. Chengalpattu, Vandalur, OMR)\n2. Total Plot Extent (in sq.ft or acres) & Survey / Patta Number\n3. Asking Price\n\nWould you like to start your free verified registry submission now?`,
        timestamp: new Date(),
        actionCta: {
          label: 'Start Free Owner Listing →',
          route: '/post-property'
        },
        suggestedFollowUps: [
          'What documents are needed to list?',
          'How does title deed verification work?',
          'What buyers are looking in Chennai?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 9: BUYER REQUESTS / DEMANDS
    // -------------------------------------------------------------
    if (
      q.includes('buyer request') || 
      q.includes('buyer demand') || 
      q.includes('demand') || 
      q.includes('who is buying') ||
      q.includes('investor request')
    ) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 🎯 Live Verified Buyer & Investor Demands\n\nOur concierge has pre-screened motivated buyers with verified bank pre-approvals ready for registration:\n\n• **Gated Villa Plot (1,800–2,400 sq.ft)**: Vandalur–Guduvanchery | Budget **₹42L – ₹60L** (Ready in 30 Days)\n• **Agro / Farm Land (1 to 3 Acres)**: Chengalpattu Road | Budget **₹75L – ₹1.40 Cr** (Immediate 50% advance)\n• **Commercial Highway Frontage**: OMR Navalur | Budget **₹2.50 Cr – ₹6.00 Cr** (Min 60ft frontage)\n• **Luxury Villa Plot**: Jubilee Hills / Kokapet | Budget **₹3.80 Cr – ₹5.50 Cr** (Bank pre-approved)\n\nIf you have matching land, you can match directly with zero commission.`,
        timestamp: new Date(),
        actionCta: {
          label: 'Match Land with Buyers →',
          route: '/post-property'
        },
        suggestedFollowUps: [
          'Find CMDA plots in Vandalur',
          'List my land for these buyers',
          'Search all available properties'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 10: SURVEY & CADASTRAL AUDIT GUARANTEE
    // -------------------------------------------------------------
    if (
      q.includes('rera') || 
      q.includes('legal') || 
      q.includes('deed') || 
      q.includes('drone') || 
      q.includes('survey')
    ) {
      const verifiedPlots = allProps.filter(p => 
        p.badges.rera || 
        p.propertyType.toLowerCase().includes('plot') ||
        p.title.toLowerCase().includes('plot')
      ).slice(0, 2);

      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `### 🛡️ Four-Eyes Survey & Cadastral Audit Guarantee\n\nEvery property displayed in Find a Plot undergoes a strict verification protocol:\n\n1. **Cadastral Boundary Demarcation**: Verified boundary stones and GPS coordinate audit by certified surveyors.\n2. **30-Year Encumbrance Audit**: SRO certified title deed inspection, Patta/Chitta clearance, and bank NOC review.\n3. **4K Aerial Drone Perspective**: True approach road widths, surrounding topography, and high-tension line checks.\n\nHere are verified cadastral listings ready for immediate registration:`,
        timestamp: new Date(),
        recommendedProperties: verifiedPlots,
        actionCta: {
          label: 'Browse All Survey-Verified Plots →',
          route: '/search',
          queryParams: { type: 'Gated CMDA Plots' }
        },
        suggestedFollowUps: [
          'Plots under ₹50 Lakhs',
          'How do I unlock 4K drone tours?',
          'I want to list my surveyed plot'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 11: BUDGET & PRICE RANGE QUERIES (e.g. 1cr - 2cr, under 50l)
    // -------------------------------------------------------------
    const budgetRange = detectBudgetRange(q);
    if (budgetRange) {
      let filteredByBudget = allProps.filter(p => {
        const num = parsePriceToNumber(p.price);
        if (budgetRange.min !== undefined && num < budgetRange.min) return false;
        if (budgetRange.max !== undefined && num > budgetRange.max) return false;
        return true;
      });

      if (q.includes('chennai')) {
        const cityFiltered = filteredByBudget.filter(p => p.city.toLowerCase() === 'chennai');
        if (cityFiltered.length > 0) filteredByBudget = cityFiltered;
      }
      if (q.includes('plot') || q.includes('land')) {
        const plotFiltered = filteredByBudget.filter(p => p.propertyType.toLowerCase().includes('plot') || p.title.toLowerCase().includes('plot'));
        if (plotFiltered.length > 0) filteredByBudget = plotFiltered;
      }

      if (filteredByBudget.length > 0) {
        return {
          id: 'ai-' + Date.now(),
          sender: 'assistant',
          text: `### 💰 ${budgetRange.label} Verified Properties\n\nI analyzed our cadastral registry and found **${filteredByBudget.length} verified properties** matching the **${budgetRange.label}** budget bracket with full survey dossiers and authenticated deeds:\n\n${filteredByBudget.map(p => `• **${p.title}** (${p.locality}, ${p.city}) — **${p.price}** (${p.sqft}${p.bhkBadge ? ' · ' + p.bhkBadge : ''})`).join('\n')}\n\nHere are the complete listing dossiers ready for cadastral audit & inspection:`,
          timestamp: new Date(),
          recommendedProperties: filteredByBudget,
          actionCta: {
            label: `View all ${budgetRange.label} in Search Directory →`,
            route: '/search',
            queryParams: { budget: (budgetRange.min === 10000000 && budgetRange.max === 20000000) ? '1cr-2cr' : undefined }
          },
          suggestedFollowUps: [
            'Filter properties with 4K drone video',
            'Show properties in Chennai',
            'I want to list my property'
          ]
        };
      }
    }

    // -------------------------------------------------------------
    // INTENT 12: PROPERTY SEARCH FILTERING BY LOCATION / TYPE / PRICE / TOKENS
    // -------------------------------------------------------------
    let matches: Property[] = [];

    // Filter by city or locality
    if (q.includes('chennai') || q.includes('vandalur') || q.includes('omr') || q.includes('guduvanchery') || q.includes('chengalpattu')) {
      matches = allProps.filter(p => p.city.toLowerCase() === 'chennai');
    } else if (q.includes('hyderabad') || q.includes('jubilee')) {
      matches = allProps.filter(p => p.city.toLowerCase() === 'hyderabad');
    } else if (q.includes('bengaluru') || q.includes('bangalore') || q.includes('lavelle')) {
      matches = allProps.filter(p => p.city.toLowerCase() === 'bengaluru');
    }

    // Filter by property type
    if (q.includes('plot') || q.includes('land') || q.includes('acres')) {
      const plotMatches = allProps.filter(p => 
        p.propertyType.toLowerCase().includes('plot') || 
        p.title.toLowerCase().includes('plot') ||
        p.title.toLowerCase().includes('land')
      );
      matches = matches.length > 0 ? matches.filter(p => plotMatches.some(pm => pm.id === p.id)) : plotMatches;
    } else if (q.includes('villa') || q.includes('house')) {
      const villaMatches = allProps.filter(p => 
        p.propertyType.toLowerCase().includes('villa') || 
        p.title.toLowerCase().includes('villa')
      );
      matches = matches.length > 0 ? matches.filter(p => villaMatches.some(vm => vm.id === p.id)) : villaMatches;
    } else if (q.includes('penthouse') || q.includes('flat') || q.includes('apartment')) {
      const flatMatches = allProps.filter(p => 
        p.propertyType.toLowerCase().includes('apartment') || 
        p.propertyType.toLowerCase().includes('penthouse') || 
        p.title.toLowerCase().includes('penthouse')
      );
      matches = matches.length > 0 ? matches.filter(p => flatMatches.some(fm => fm.id === p.id)) : flatMatches;
    }

    // Keyword matching if property keywords were mentioned
    if (matches.length === 0) {
      const stopWords = ['show', 'find', 'get', 'me', 'the', 'in', 'at', 'with', 'for', 'of', 'and', 'a', 'an', 'to', 'is', 'are', 'i', 'want', 'need', 'looking'];
      const searchTokens = q.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w));
      if (searchTokens.length > 0) {
        matches = allProps.filter(p => {
          const fullText = `${p.title} ${p.locality} ${p.city} ${p.propertyType} ${p.bhkBadge} ${(p.highlights || []).join(' ')} ${p.badges?.specialTag || ''}`.toLowerCase();
          return searchTokens.some(t => fullText.includes(t));
        });
      }
    }

    // If matches found
    if (matches.length > 0) {
      const displayMatches = matches.slice(0, 3);
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `I analyzed our registry and found **${displayMatches.length} verified listings** matching your search criteria with full survey dossiers and 4K aerial photography:`,
        timestamp: new Date(),
        recommendedProperties: displayMatches,
        actionCta: {
          label: 'View Full Search Results Directory →',
          route: '/search'
        },
        suggestedFollowUps: [
          'Filter plots with 4K drone video',
          'Show properties under ₹1 Crore',
          'I want to list my own property'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 13: CONVERSATIONAL & SHORT CHAT CATCH-ALL
    // -------------------------------------------------------------
    const commonChatWords = ['why', 'what', 'who', 'how', 'when', 'where', 'tell', 'explain', 'do', 'does', 'can', 'could', 'would', 'is', 'are', 'am'];
    const hasQuestionWords = cleanTokens.some(t => commonChatWords.includes(t));

    if (hasQuestionWords || cleanTokens.length <= 3) {
      return {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: `I'm here and listening! As your **Find a Plot AI Concierge**, I specialize in helping you explore verified cadastral plots, understand land legalities (like Patta, Chitta, CMDA, and DTCP approvals), or list your property directly without middleman charges.\n\nCould you clarify what kind of property, location, or land assistance you're looking for?`,
        timestamp: new Date(),
        suggestedFollowUps: [
          'Find CMDA plots under ₹50 Lakhs',
          'Show properties in Chennai',
          'What is Patta and Chitta?',
          'Show active buyer requests'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 14: PROPERTY SEARCH WITH NO DIRECT INVENTORY
    // -------------------------------------------------------------
    return {
      id: 'ai-' + Date.now(),
      sender: 'assistant',
      text: `We currently don't have direct listings matching **"${query}"** in our active cadastral registry.\n\n💡 **Tip**: You can post a **Buyer Request** so verified direct owners and developers can reach out to you with matching parcels, or explore our active verified listings:\n\n• **Locations**: *Chennai (Vandalur, OMR, Chengalpattu)*, *Hyderabad (Jubilee Hills)*, *Bengaluru (Lavelle Rd)*\n• **Categories**: *Gated CMDA Plots*, *Independent Villas*, *Farmlands*`,
      timestamp: new Date(),
      actionCta: {
        label: 'Browse Complete Property Registry →',
        route: '/search'
      },
      suggestedFollowUps: [
        'Find CMDA plots under ₹50 Lakhs',
        'Show properties in Chennai',
        'Post a buyer request'
      ]
    };
  }
}

