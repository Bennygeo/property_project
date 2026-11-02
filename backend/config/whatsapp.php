<?php
/**
 * Meta WhatsApp Business Cloud API Configuration
 *
 * Provides automated outbound WhatsApp OTP delivery to users' inboxes.
 * Meta provides 1,000 free conversations every month for every WhatsApp Business Account.
 *
 * How to get your credentials:
 * 1. Visit: https://developers.facebook.com/apps
 * 2. Select / Create your App -> WhatsApp -> API Setup
 * 3. Copy:
 *    - Phone Number ID
 *    - Temporary / Permanent Access Token
 */

declare(strict_types=1);

namespace Mannidam\Config;

class WhatsAppConfig {
    /**
     * Meta WhatsApp Cloud API Permanent or System User Access Token
     */
    public static function getAccessToken(): string {
        return $_ENV['META_WHATSAPP_TOKEN']
            ?? getenv('META_WHATSAPP_TOKEN')
            ?: ''; // Paste your Meta WhatsApp Cloud API Access Token here
    }

    /**
     * Meta Phone Number ID (from Meta Developers Dashboard -> WhatsApp -> API Setup)
     */
    public static function getPhoneNumberId(): string {
        return $_ENV['META_WHATSAPP_PHONE_ID']
            ?? getenv('META_WHATSAPP_PHONE_ID')
            ?: ''; // Paste your Phone Number ID here (e.g. 104829102938102)
    }

    /**
     * Meta WhatsApp Business Account ID (WABA ID)
     */
    public static function getBusinessAccountId(): string {
        return $_ENV['META_WHATSAPP_WABA_ID']
            ?? getenv('META_WHATSAPP_WABA_ID')
            ?: '';
    }

    /**
     * Meta WhatsApp Cloud API Version
     */
    public static function getApiVersion(): string {
        return 'v20.0';
    }

    /**
     * Optional pre-approved template name (e.g. 'authentication_otp' or 'findaplot_otp')
     * If empty, sends standard direct WhatsApp notification.
     */
    public static function getTemplateName(): string {
        return $_ENV['META_WHATSAPP_TEMPLATE']
            ?? getenv('META_WHATSAPP_TEMPLATE')
            ?: '';
    }
}

