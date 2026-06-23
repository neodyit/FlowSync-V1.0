<?php
// backend/src/Utils/FCMSender.php
namespace FlowSync;

use Exception;

class FCMSender {
    private string $credentialsPath;
    private array $credentials;
    private ?string $accessToken = null;
    private int $tokenExpiry = 0;

    public function __construct(string $credentialsPath = null) {
        if ($credentialsPath === null) {
            $credentialsPath = __DIR__ . '/firebase_credentials.json';
        }
        
        if (!file_exists($credentialsPath)) {
            throw new Exception("Firebase credentials file not found at: $credentialsPath");
        }
        
        $this->credentialsPath = $credentialsPath;
        $this->credentials = json_decode(file_get_contents($credentialsPath), true);
        
        if (!isset($this->credentials['client_email']) || !isset($this->credentials['private_key'])) {
            throw new Exception("Invalid Firebase credentials format");
        }
    }

    private function getAccessToken(): string {
        // Reuse token if still valid (with 60s buffer)
        if ($this->accessToken && time() < ($this->tokenExpiry - 60)) {
            return $this->accessToken;
        }

        $now = time();
        $payload = [
            'iss' => $this->credentials['client_email'],
            'sub' => $this->credentials['client_email'],
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging'
        ];

        // Create JWT manually using RS256 since composer/firebase-php-jwt is not available
        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
        
        $signatureInput = $base64UrlHeader . "." . $base64UrlPayload;
        
        $signature = '';
        if (!openssl_sign($signatureInput, $signature, $this->credentials['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new Exception("OpenSSL signing failed. Is the private key valid?");
        }
        
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        $jwt = $signatureInput . "." . $base64UrlSignature;

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]));

        $response = curl_exec($ch);
        if (curl_errno($ch)) {
            throw new Exception("Curl error when getting token: " . curl_error($ch));
        }
        curl_close($ch);

        $data = json_decode($response, true);
        if (!isset($data['access_token'])) {
            throw new Exception("Failed to get OAuth token: " . $response);
        }

        $this->accessToken = $data['access_token'];
        $this->tokenExpiry = $now + ($data['expires_in'] ?? 3600);
        
        return $this->accessToken;
    }

    public function sendPushNotification(string $fcmToken, string $title, string $body, array $data = []): bool {
        try {
            $accessToken = $this->getAccessToken();
            $projectId = $this->credentials['project_id'];
            $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

            $payload = [
                'message' => [
                    'token' => $fcmToken,
                    'notification' => [
                        'title' => $title,
                        'body' => $body
                    ],
                    'data' => array_map('strval', $data) // FCM data values must be strings
                ]
            ];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer {$accessToken}",
                "Content-Type: application/json"
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            error_log("FCM Send Response: HTTP $httpCode - Response: $response");

            return $httpCode >= 200 && $httpCode < 300;
        } catch (Exception $e) {
            error_log("FCM Send Exception: " . $e->getMessage());
            return false;
        }
    }
}
