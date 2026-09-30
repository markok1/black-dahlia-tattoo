<?php
/**
 * Appointment / booking form handler (Zakaži termin — pocetna strana / index).
 * Fields: name, email, phone, tattooplace, tattoocolor, tattoosize, message.
 * Always responds with JSON: {"status":"success"} or {"status":"error"}.
 */

// Never let PHP warnings/notices leak into the response body — they would
// corrupt the JSON the front-end parses. Errors are logged server-side instead.
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');

// ---- Configuration ---------------------------------------------------------
$mailto    = "blackdahliabooking1@gmail.com";          // where the studio receives the request
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
$tattooplace = field('tattooplace');
$tattoocolor = field('tattoocolor');
$tattoosize  = field('tattoosize');
$message     = field('message');

// ---- Validation ------------------------------------------------------------
if ($name === '' || !filter_var($visitorMail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(array('status' => 'error', 'reason' => 'invalid_input'));
    exit;
}

// ---- Email to the studio ---------------------------------------------------
$subject = "Novo zakazivanje termina — tattoobeograd.rs";
$body =
    "Novi zahtev za zakazivanje termina:\n\n" .
    "Ime i prezime:\n" . $name . "\n\n" .
    "Email:\n" . $visitorMail . "\n\n" .
    "Telefon:\n" . $phone . "\n\n" .
    "Deo tela:\n" . $tattooplace . "\n\n" .
    "Boja tetovaže:\n" . $tattoocolor . "\n\n" .
    "Veličina tetovaže:\n" . $tattoosize . "\n\n" .
    "Poruka klijenta:\n" . $message . "\n";

$headers  = "From: " . $fromName . " <" . $fromEmail . ">\r\n";
$headers .= "Reply-To: " . clean_header($name) . " <" . $visitorMail . ">\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// ---- Confirmation email to the visitor -------------------------------------
$subject2 = "Potvrda: Vaš zahtev za termin je poslat — tattoobeograd.rs";
$body2 =
    "Poštovani/a " . $name . ",\n\n" .
    "Vaš zahtev za zakazivanje termina nam je stigao. Kontaktiraćemo Vas u najkraćem mogućem roku radi dogovora.\n\n" .
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
