<?php
// Hostinger PHP Webhook Endpoint for Meta WhatsApp Cloud API & AI Auto-Reply

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$expected_verify_token = 'alphashop_whatsapp_verify_token_123';

// -------------------------------------------------------------
// 1. Meta Webhook Verification Handshake (GET Request)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mode = $_GET['hub_mode'] ?? $_GET['hub_mode'] ?? ($_GET['hub.mode'] ?? '');
    $token = $_GET['hub_verify_token'] ?? $_GET['hub_verify_token'] ?? ($_GET['hub.verify_token'] ?? '');
    $challenge = $_GET['hub_challenge'] ?? $_GET['hub_challenge'] ?? ($_GET['hub.challenge'] ?? '');

    if (isset($_GET['token'])) {
        $token = $_GET['token'];
    }

    if ($token === $expected_verify_token || $mode === 'subscribe') {
        http_response_code(200);
        echo $challenge ? $challenge : 'OK';
        exit;
    } else {
        http_response_code(403);
        echo 'Verification token mismatch';
        exit;
    }
}

// -------------------------------------------------------------
// 2. Process POST Requests
// -------------------------------------------------------------
$raw_input = file_get_contents('php://input');
$body = json_decode($raw_input, true) ?? [];

// Helper function to call AI APIs (OpenAI, Gemini, Groq)
function generateAiReplyPHP($provider, $apiKey, $model, $systemPrompt, $userMsg) {
    if (empty($apiKey)) {
        return "Salam! 👋 شكراً لتواصلك معنا في متجرنا. كيف يمكننا مساعدتك اليوم؟";
    }

    $apiKey = trim($apiKey);

    // Auto-detect provider based on key format
    if (strpos($apiKey, 'AQ.') === 0 || strpos($apiKey, 'AIza') === 0) {
        $provider = 'gemini';
    } else if (strpos($apiKey, 'gsk_') === 0) {
        $provider = 'groq';
    } else if (strpos($apiKey, 'sk-') === 0) {
        $provider = 'openai';
    }

    // Google Gemini API (with automatic fallback models)
    if ($provider === 'gemini') {
        $modelsToTry = array_unique(array_filter([
            $model,
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-pro'
        ]));

        $lastError = '';

        foreach ($modelsToTry as $m) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$m}:generateContent?key=" . urlencode($apiKey);

            $payload = [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $systemPrompt . "\n\nسؤال الزبون: " . $userMsg]
                        ]
                    ]
                ]
            ];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);

            $result = curl_exec($ch);
            curl_close($ch);

            $json = json_decode($result, true);
            if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
                return $json['candidates'][0]['content']['parts'][0]['text'];
            }
            if (isset($json['error']['message'])) {
                $lastError = $json['error']['message'];
            }
        }
        return "⚠️ خطأ من Gemini API: " . ($lastError ?: "تأكد من صحة المفتاح والنموذج");
    }

    // Groq (Llama 3)
    if ($provider === 'groq') {
        $groqModel = (!empty($model) && strpos($model, 'llama') !== false) ? $model : 'llama-3.3-70b-versatile';
        $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
        $payload = [
            'model' => $groqModel,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userMsg]
            ]
        ];

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ]);

        $result = curl_exec($ch);
        curl_close($ch);

        $json = json_decode($result, true);
        if (isset($json['error']['message'])) {
            return "⚠️ خطأ من Groq API: " . $json['error']['message'];
        }
        return $json['choices'][0]['message']['content'] ?? "Salam! 👋 مرحباً بك في متجرنا.";
    }

    // Default: OpenAI / ChatGPT
    $openAiModel = (!empty($model) && strpos($model, 'gpt') !== false) ? $model : 'gpt-4o-mini';
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    $payload = [
        'model' => $openAiModel,
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userMsg]
        ],
        'temperature' => 0.7
    ];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);

    $result = curl_exec($ch);
    curl_close($ch);

    $json = json_decode($result, true);
    if (isset($json['error']['message'])) {
        return "⚠️ خطأ من OpenAI API: " . $json['error']['message'];
    }
    return $json['choices'][0]['message']['content'] ?? "Salam! 👋 مرحباً بك في متجرنا.";
}

// Dashboard Simulation Action
if (isset($body['action']) && $body['action'] === 'simulate') {
    $msg = $body['message'] ?? 'السلام عليكم';
    $settings = $body['settings'] ?? [];
    $apiKey = trim($settings['ai_api_key'] ?? '');
    $provider = $settings['ai_provider'] ?? 'openai';
    $model = $settings['ai_model'] ?? '';
    $prompt = $settings['system_prompt'] ?? 'أنت مساعد مبيعات احترافي للمتجر.';

    $reply = generateAiReplyPHP($provider, $apiKey, $model, $prompt, $msg);
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'response' => $reply]);
    exit;
}

// Meta Webhook Event POST
$entry = $body['entry'][0] ?? null;
$changes = $entry['changes'][0] ?? null;
$value = $changes['value'] ?? null;
$messages = $value['messages'] ?? null;

if (!empty($messages)) {
    $msg = $messages[0];
    $fromPhone = $msg['from'] ?? '';
    $msgText = $msg['text']['body'] ?? '';

    if (!empty($fromPhone) && !empty($msgText)) {
        $prompt = "أنت مساعد مبيعات احترافي للمتجر في المغرب. تجيب بالدارجة المغربية أو الفرنسية بأسلوب مؤدب وسريع.";
        $reply = generateAiReplyPHP('openai', '', 'gpt-4o-mini', $prompt, $msgText);
        
        $phoneId = $_ENV['WHATSAPP_PHONE_NUMBER_ID'] ?? '';
        $waToken = $_ENV['WHATSAPP_TOKEN'] ?? '';
        if ($phoneId && $waToken) {
            // Send Meta response
            $ch = curl_init("https://graph.facebook.com/v18.0/{$phoneId}/messages");
            $payload = [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $fromPhone,
                'type' => 'text',
                'text' => ['body' => preg_replace('/\*\*(.*?)\*\*/', '*$1*', $reply)]
            ];
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $waToken
            ]);
            curl_exec($ch);
            curl_close($ch);
        }
    }
}

http_response_code(200);
header('Content-Type: application/json');
echo json_encode(['status' => 'success']);
