<?php
/**
 * Course sign-up form handler (Prijava za kurs — kurs strana).
 * Fields: name, email, phone, datum, message.
 * Always responds with JSON: {"status":"success"} or {"status":"error"}.
 */

// Never let PHP warnings/notices leak into the response body — they would
// corrupt the JSON the front-end parses. Errors are logged server-side instead.
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');

// ---- Configuration ---------------------------------------------------------
$mailto    = "blackdahliabooking1@gmail.com";          // where the studio receives the sign-up
$fromEmail = "noreply@tattoobeograd.rs";               // MUST be an address on the site's own domain (SPF/DKIM)
$fromName  = "The Black Dahlia Tattoo";

// ---- Helpers ---------------------------------------------------------------
function clean_header($value) {
    return trim(str_replace(array("\r", "\n", "%0a", "%0d"), '', (string) $value));
}
function field($key) {
    return isset($_POST[$key]) ? trim($_POST[$key]) : '';
}

// ---- Incoming data ---------------------------------------------------------
$name        = field('name');
$visitorMail = clean_header(field('email'));
$phone       = field('phone');
$datum       = field('datum');
$message     = field('message');

// ---- Validation ------------------------------------------------------------
if ($name === '' || !filter_var($visitorMail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(array('status' => 'error', 'reason' => 'invalid_input'));
    exit;
}

// ---- Email to the studio ---------------------------------------------------
$subject = "Nova prijava za kurs — tattoobeograd.rs";
$body =
    "Nova prijava za kurs:\n\n" .
    "Ime i prezime:\n" . $name . "\n\n" .
    "Email:\n" . $visitorMail . "\n\n" .
    "Telefon:\n" . $phone . "\n\n" .
    "Željeni datum:\n" . $datum . "\n\n" .
    "Poruka klijenta:\n" . $message . "\n";

$headers  = "From: " . $fromName . " <" . $fromEmail . ">\r\n";
$headers .= "Reply-To: " . clean_header($name) . " <" . $visitorMail . ">\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// ---- Confirmation email to the visitor -------------------------------------
$subject2 = "Potvrda: Vaša prijava za kurs je poslata — tattoobeograd.rs";
$body2 =
    "Poštovani/a " . $name . ",\n\n" .
    "Vaša prijava za kurs nam je stigla. Kontaktiraćemo Vas u najkraćem mogućem roku sa svim detaljima.\n\n" .
    ($message !== '' ? "Vaša poruka:\n'" . $message . "'\n\n" : "") .
    "Srdačan pozdrav,\nThe Black Dahlia Tattoo\n";

$headers2  = "From: " . $fromName . " <" . $fromEmail . ">\r\n";
$headers2 .= "Reply-To: " . $fromName . " <" . $mailto . ">\r\n";
$headers2 .= "MIME-Version: 1.0\r\n";
$headers2 .= "Content-Type: text/plain; charset=UTF-8\r\n";

// ---- Send ------------------------------------------------------------------
$sentToStudio = @mail($mailto, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
@mail($visitorMail, '=?UTF-8?B?' . base64_encode($subject2) . '?=', $body2, $headers2);

if ($sentToStudio) {
    echo json_encode(array('status' => 'success'));
} else {
    http_response_code(500);
    echo json_encode(array('status' => 'error', 'reason' => 'mail_failed'));
}
