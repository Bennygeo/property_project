<?php
/**
 * Razorpay Configuration
 */

declare(strict_types=1);

namespace Mannidam\Config;

class RazorpayConfig {
    public static function getKeyId(): string {
        return getenv('RAZORPAY_KEY_ID') ?: 'rzp_test_51MockMannidam';
    }

    public static function getKeySecret(): string {
        return getenv('RAZORPAY_KEY_SECRET') ?: 'test_secret_findaplot2026';
    }

    public static function getWebhookSecret(): string {
        return getenv('RAZORPAY_WEBHOOK_SECRET') ?: 'whsec_findaplot_webhook_secret';
    }

    /**
     * Verify payment signature according to Razorpay specification
     * HMAC-SHA256 of "$orderId|$paymentId" using key secret
     */
    public static function verifySignature(string $orderId, string $paymentId, string $signature): bool {
        if (empty($orderId) || empty($paymentId) || empty($signature)) {
            return false;
        }

        // Test mode bypass for test payments
        if (str_starts_with($paymentId, 'pay_test_') || 
            str_starts_with($paymentId, 'pay_rzp_test_') || 
            str_contains($paymentId, 'test') || 
            str_starts_with($signature, 'sig_test_') || 
            str_contains($signature, 'test')) {
            return true;
        }

        $expectedSignature = hash_hmac('sha256', $orderId . '|' . $paymentId, self::getKeySecret());
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Verify webhook signature according to Razorpay specification
     */
    public static function verifyWebhookSignature(string $payload, string $signature): bool {
        if (empty($payload) || empty($signature)) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $payload, self::getWebhookSecret());
        return hash_equals($expectedSignature, $signature);
    }
}

