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

    // Allow override from query param
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

// Helper function to call OpenAI API via cURL
function callOpenAI($apiKey, $model, $systemPrompt, $userMsg) {
    if (empty($apiKey)) {
        return "Salam! 👋 شكراً لتواصلك معنا. كيف يمكننا مساعدتك اليوم؟";
    }

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    $payload = [
        'model' => $model ?: 'gpt-4o-mini',
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
    return $json['choices'][0]['message']['content'] ?? "Salam! 👋 شكراً لتواصلك معنا. مرحباً بك في متجرنا.";
}

// Helper function to send message via Meta WhatsApp Cloud API
function sendMetaWhatsAppMessage($phoneId, $waToken, $toPhone, $messageText) {
    if (empty($phoneId) || empty($waToken)) return false;

    // Convert markdown **text** to WhatsApp *text*
    $formattedText = preg_replace('/\*\*(.*?)\*\*/', '*$1*', $messageText);

    $ch = curl_init("https://graph.facebook.com/v18.0/{$phoneId}/messages");
    $payload = [
        'messaging_product' => 'whatsapp',
        'recipient_type' => 'individual',
        'to' => $toPhone,
        'type' => 'text',
        'text' => ['body' => $formattedText]
    ];

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $waToken
    ]);

    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}

// Dashboard Simulation Action
if (isset($body['action']) && $body['action'] === 'simulate') {
    $msg = $body['message'] ?? 'السلام عليكم';
    $settings = $body['settings'] ?? [];
    $apiKey = $settings['ai_api_key'] ?? '';
    $model = $settings['ai_model'] ?? 'gpt-4o-mini';
    $prompt = $settings['system_prompt'] ?? 'أنت مساعد مبيعات احترافي للمتجر.';

    $reply = callOpenAI($apiKey, $model, $prompt, $msg);
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'response' => $reply]);
    exit;
}

// Incoming Meta WhatsApp Event
$entry = $body['entry'][0] ?? null;
$changes = $entry['changes'][0] ?? null;
$value = $changes['value'] ?? null;
$messages = $value['messages'] ?? null;

if (!empty($messages)) {
    $msg = $messages[0];
    $fromPhone = $msg['from'] ?? '';
    $msgText = $msg['text']['body'] ?? '';

    if (!empty($fromPhone) && !empty($msgText)) {
        // Fallback default AI response
        $prompt = "أنت مساعد مبيعات احترافي للمتجر في المغرب. تجيب بالدارجة المغربية أو الفرنسية بأسلوب مؤدب وسريع.";
        $reply = callOpenAI('', 'gpt-4o-mini', $prompt, $msgText);
        
        // Dispatched if phone ID and token are present in request or env
        $phoneId = $_ENV['WHATSAPP_PHONE_NUMBER_ID'] ?? '';
        $waToken = $_ENV['WHATSAPP_TOKEN'] ?? '';
        if ($phoneId && $waToken) {
            sendMetaWhatsAppMessage($phoneId, $waToken, $fromPhone, $reply);
        }
    }
}

http_response_code(200);
header('Content-Type: application/json');
echo json_encode(['status' => 'success']);
