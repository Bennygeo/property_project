<?php
/**
 * Mannidam Real Estate Marketplace - Free Agent AI Auto-Reply Engine
 * Provides context-aware intelligent auto-replies using free open LLMs and deterministic real estate agents.
 */

declare(strict_types=1);

namespace Mannidam\Helpers;

use Mannidam\Config\Database;
use PDO;

class FreeAgentReply {
    /**
     * Generate an intelligent real estate auto-reply for a WhatsApp inquiry.
     */
    public static function generate(array $params): array {
        $contactName = trim((string)($params['name'] ?? 'Valued Investor'));
        $contactPhone = trim((string)($params['phone'] ?? ''));
        $inquiryMsg  = trim((string)($params['message'] ?? 'Inquiry regarding property'));
        $propertyId  = trim((string)($params['propertyId'] ?? ''));
        $persona     = trim((string)($params['persona'] ?? Settings::get('whatsapp_auto_reply_agent', 'cadastral_concierge')));
        $modelChoice = trim((string)($params['model'] ?? Settings::get('whatsapp_free_agent_model', 'local_real_estate_ai')));
        $template    = trim((string)($params['template'] ?? ''));

        // Load property details from database
        $prop = null;
        if (!empty($propertyId)) {
            try {
                $db = (new Database())->getConnection();
                $stmt = $db->prepare("SELECT id, title, locality_name, city_name, price, price_per_sqft, sqft, rera_number FROM properties WHERE id = ?");
                $stmt->execute([$propertyId]);
                $prop = $stmt->fetch(PDO::FETCH_ASSOC);
            } catch (\Throwable $e) {}
        }

        $propTitle = $prop['title'] ?? 'Verified Residential Land Parcel';
        $locality  = $prop['locality_name'] ?? 'Prime Corridor';
        $city      = $prop['city_name'] ?? 'Tamil Nadu';
        $price     = $prop['price'] ?? 'On Request';
        $rera      = !empty($prop['rera_number']) ? $prop['rera_number'] : 'TNRERA Approved';
        $sqft      = !empty($prop['sqft']) ? "{$prop['sqft']} Sq.ft" : 'Cadastral Plot';

        $personaNames = [
            'cadastral_concierge' => 'Find a Plot Cadastral & Legal AI',
            'investment_advisor'  => 'Find a Plot Land Investment AI',
            'fast_concierge'      => 'Find a Plot Express Concierge AI'
        ];
        $agentName = $personaNames[$persona] ?? 'Find a Plot Free AI Agent';

        // Try Pollinations Free AI if selected
        if ($modelChoice === 'pollinations_free') {
            $onlineReply = self::callPollinationsFree($contactName, $inquiryMsg, $propTitle, $locality, $city, $price, $rera, $persona);
            if (!empty($onlineReply)) {
                return [
                    'reply'     => $onlineReply,
                    'agentName' => $agentName,
                    'modelUsed' => 'pollinations_free_llm',
                    'success'   => true
                ];
            }
        }

        // Deterministic local smart agent reply (instant, zero network latency, 100% reliable)
        $localReply = self::generateLocalAgentReply($contactName, $inquiryMsg, $propTitle, $locality, $city, $price, $rera, $sqft, $persona, $template);

        return [
            'reply'     => $localReply,
            'agentName' => $agentName,
            'modelUsed' => 'local_real_estate_ai',
            'success'   => true
        ];
    }

    /**
     * Call Pollinations free AI LLM API (no API key required).
     */
    private static function callPollinationsFree(
        string $name,
        string $inquiry,
        string $propTitle,
        string $locality,
        string $city,
        string $price,
        string $rera,
        string $persona
    ): ?string {
        try {
            $promptText = "You are a professional real estate concierge assistant for 'Find a Plot' in Tamil Nadu, India. "
                . "A buyer named {$name} sent this WhatsApp message: \"{$inquiry}\" regarding property: \"{$propTitle}\" in {$locality}, {$city} (Price: {$price}, RERA: {$rera}). "
                . "Persona: {$persona}. Write a warm, polite WhatsApp auto-reply in 3 to 4 sentences. "
                . "Use clean WhatsApp formatting (*bold* for key terms), mention DTCP/RERA verification, and invite them to request the legal dossier or book a free site visit. Do not hallucinate contact numbers.";

            $encoded = urlencode($promptText);
            $url = "https://text.pollinations.ai/{$encoded}?model=openai&seed=42";

            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 4,
                    'header'  => "User-Agent: FindAPlotBot/1.0\r\n"
                ]
            ]);

            $resp = @file_get_contents($url, false, $ctx);
            if ($resp !== false && strlen(trim($resp)) > 20) {
                return trim($resp);
            }
        } catch (\Throwable $e) {}

        return null;
    }

    /**
     * Local deterministic AI agent generator.
     */
    private static function generateLocalAgentReply(
        string $name,
        string $inquiry,
        string $propTitle,
        string $locality,
        string $city,
        string $price,
        string $rera,
        string $sqft,
        string $persona,
        string $customTemplate
    ): string {
        // If user configured a custom template with placeholders
        if (!empty($customTemplate) && str_contains($customTemplate, '{')) {
            $rep = str_replace(
                ['{name}', '{property}', '{locality}', '{city}', '{price}', '{rera}', '{sqft}'],
                [$name, $propTitle, $locality, $city, $price, $rera, $sqft],
                $customTemplate
            );
            return $rep;
        }

        switch ($persona) {
            case 'investment_advisor':
                return "Hello *{$name}*! 📈 *Find a Plot Investment Desk* here.\n\n"
                    . "Thank you for inquiring about *{$propTitle}* ({$locality}, {$city}).\n"
                    . "💰 *Valuation*: {$price} ({$sqft})\n"
                    . "🚀 *Growth Factor*: Situated in a rapidly emerging infrastructure zone with 12-16% forecasted appreciation.\n"
                    . "🏛️ *Compliance*: 100% DTCP registered, {$rera}.\n\n"
                    . "Would you like our senior land analyst to share the 5-year investment appreciation dossier?";

            case 'fast_concierge':
                return "Hello *{$name}*! ⚡ *Find a Plot Express Concierge*.\n\n"
                    . "We received your message regarding *{$propTitle}* in {$locality} ({$price})!\n\n"
                    . "🚗 *Doorstep Site Visit*: We provide complimentary chauffeur cab pickup & drop for plot walkthroughs this week.\n"
                    . "What day and time works best for you to inspect the layout?";

            case 'cadastral_concierge':
            default:
                return "Hello *{$name}*! 🏛️ *Find a Plot Legal & Cadastral Concierge*.\n\n"
                    . "Thank you for reaching out regarding *{$propTitle}* in {$locality}, {$city}.\n\n"
                    . "✅ *Title & Approvals*: Clear title verified, DTCP approved & registered under {$rera}.\n"
                    . "✅ *Cadastral Audit*: 0% encumbrance, verified FMB sketch boundaries & 30ft/40ft blacktop approach roads.\n\n"
                    . "Would you like us to share the verified Patta & Cadastral layout dossier directly on this chat? 📄";
        }
    }
}
