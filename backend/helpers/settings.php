<?php
/**
 * Mannidam Real Estate Marketplace - Platform Settings Helper
 */

declare(strict_types=1);

namespace Mannidam\Helpers;

use Mannidam\Config\Database;
use PDO;

class Settings {
    private static ?array $cached = null;

    /**
     * Fetch all settings as key => value dictionary.
     */
    public static function getAll(): array {
        if (self::$cached !== null) {
            return self::$cached;
        }

        $defaults = [
            'whatsapp_number'             => '9486140936',
            'whatsapp_country_code'        => '91',
            'whatsapp_display_name'        => 'Find a Plot Concierge Desk',
            'whatsapp_auto_reply_enabled'  => '1',
            'whatsapp_auto_reply_agent'    => 'cadastral_concierge',
            'whatsapp_free_agent_model'    => 'local_real_estate_ai',
            'whatsapp_auto_reply_template' => 'Hi {name}! Thank you for inquiring about {property} in {locality}. Our AI Concierge has logged your request. This property is DTCP/TNRERA verified with clear title deeds. Would you like our executive to share the legal cadastral dossier or book a free chauffeur site visit?'
        ];

        try {
            $db = (new Database())->getConnection();
            $stmt = $db->query("SELECT setting_key, setting_value FROM platform_settings");
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            self::$cached = array_merge($defaults, $rows ?: []);
        } catch (\Throwable $e) {
            self::$cached = $defaults;
        }

        return self::$cached;
    }

    /**
     * Get single setting value by key with optional fallback.
     */
    public static function get(string $key, ?string $default = null): string {
        $all = self::getAll();
        return $all[$key] ?? ($default ?? '');
    }

    /**
     * Set a setting in platform_settings table.
     */
    public static function set(string $key, string $value, string $group = 'whatsapp', ?string $desc = null): void {
        $db = (new Database())->getConnection();
        $stmt = $db->prepare("
            INSERT INTO platform_settings (setting_key, setting_value, setting_group, description)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        $stmt->execute([$key, $value, $group, $desc]);
        if (self::$cached !== null) {
            self::$cached[$key] = $value;
        }
    }

    /**
     * Get full WhatsApp number with country code (e.g. 919486140936).
     */
    public static function getWhatsAppFullNumber(): string {
        $cc = preg_replace('/[^\d]/', '', self::get('whatsapp_country_code', '91'));
        $num = preg_replace('/[^\d]/', '', self::get('whatsapp_number', '9486140936'));
        // If number already starts with country code, do not duplicate
        if (str_starts_with($num, $cc)) {
            return $num;
        }
        return $cc . $num;
    }
}
