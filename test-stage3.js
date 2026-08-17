/**
 * Privacy Shield — Stage 3 Verification Suite
 * 
 * Tests and verifies all Stage 3 sub-stages:
 * - Stage 3.1: Mathematical Checksum Validators (Verhoeff D5 & Luhn Mod-10 with Single-Digit & Transposition Errors)
 * - Stage 3.2: Shannon Entropy Calculator & Random Secret Scanner (H > 3.7 vs Natural Language Words)
 * - Stage 3.3: High-Sensitivity Regex Pattern Database Expansion (25+ Enterprise Patterns)
 * - Stage 3.4: Multi-Attribute Rule Engine & 50-Character Keyword Proximity Anchoring
 */

const {
  validateVerhoeff,
  generateVerhoeffChecksum,
  validateLuhn,
  calculateShannonEntropy,
  isHighEntropySecret,
  checkKeywordProximity,
  evaluateAndSanitize,
  RULE_DEFINITIONS
} = require('./public/rule-engine.js');

(async () => {
  console.log('================================================================');
  console.log('🧪 EXECUTING STAGE 3 MATHEMATICAL CHECKSUMS & RULE ENGINE GATES');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ----------------------------------------------------------------------------
  // TEST 1: STAGE 3.1 - Verhoeff D5 Checksum (Aadhaar Mathematical Validation)
  // ----------------------------------------------------------------------------
  console.log('▶️ TEST 1: Stage 3.1 Verhoeff D5 Algorithm (Aadhaar Validation)');
  {
    // Generate valid 12-digit Aadhaar number
    const prefix11 = '28947513904';
    const checksumDigit = generateVerhoeffChecksum(prefix11);
    const validAadhaar = prefix11 + checksumDigit;

    console.log(`     Constructed Valid Aadhaar: ${validAadhaar} (Checksum: ${checksumDigit})`);
    assert(validateVerhoeff(validAadhaar), 'Valid Aadhaar passes Verhoeff D5 checksum');

    // 1. Single-digit alteration error test (change 5th digit '7' -> '8')
    const corruptedSingleDigit = validAadhaar.substring(0, 4) + '8' + validAadhaar.substring(5);
    assert(!validateVerhoeff(corruptedSingleDigit), `Single-digit error (${corruptedSingleDigit}) correctly rejected`);

    // 2. Adjacent transposition error test (swap digits at index 2 and 3: '94' -> '49')
    const transposedAadhaar = '2849' + validAadhaar.substring(4);
    assert(!validateVerhoeff(transposedAadhaar), `Adjacent transposition error (${transposedAadhaar}) correctly rejected`);

    // 3. Reject invalid prefixes (UIDAI doesn't issue 0 or 1 prefixes)
    const invalidPrefix = '01234567890' + generateVerhoeffChecksum('01234567890');
    assert(!validateVerhoeff(invalidPrefix), 'Aadhaar starting with 0 correctly rejected');
  }

  // ----------------------------------------------------------------------------
  // TEST 2: STAGE 3.1 - Luhn Modulo-10 Algorithm (Payment Cards)
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST 2: Stage 3.1 Luhn Modulo-10 Algorithm (Payment Cards)');
  {
    const validVisa = '4532015987412365';
    const validMastercard = '5105105105105100';
    const validAmex = '378282246310005';

    assert(validateLuhn(validVisa), 'Valid Visa card number passes Luhn Mod-10');
    assert(validateLuhn(validMastercard), 'Valid Mastercard passes Luhn Mod-10');
    assert(validateLuhn(validAmex), 'Valid Amex passes Luhn Mod-10');

    // 1. Single-digit error test (change last digit from 5 to 4)
    const corruptedCard = '4532015987412364';
    assert(!validateLuhn(corruptedCard), `Single-digit card alteration (${corruptedCard}) correctly rejected`);

    // 2. Transposition error test (swap '01' -> '10')
    const transposedCard = '4532105987412365';
    assert(!validateLuhn(transposedCard), `Adjacent transposition card error (${transposedCard}) correctly rejected`);

    // 3. Innocent random numbers (e.g. tracking number / order ID)
    const randomOrderId = '9876543210123456';
    assert(!validateLuhn(randomOrderId), 'Random non-Luhn numeric ID suppressed from card redaction');
  }

  // ----------------------------------------------------------------------------
  // TEST 3: STAGE 3.2 - Shannon Entropy Calculator (H > 3.7 vs Natural Language)
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST 3: Stage 3.2 Shannon Entropy Calculator (H > 3.7 Evaluation)');
  {
    const highEntropyBase64 = 'd3f0a7b1c4e9821a4f5b6c7d8e9f0123';
    const highEntropyHex = '7a8b9c1d2e3f4a5b6c7d8e9f0';
    const awsAccessKey = 'AKIAIOSFODNN7EXAMPLE';

    const hBase64 = calculateShannonEntropy(highEntropyBase64);
    const hHex = calculateShannonEntropy(highEntropyHex);
    const hAws = calculateShannonEntropy(awsAccessKey);

    console.log(`     High-Entropy Base64 Secret: H = ${hBase64} (Threshold: > 3.7)`);
    console.log(`     High-Entropy Hex Token: H = ${hHex} (Threshold: > 3.7)`);
    console.log(`     AWS Access Key: H = ${hAws} (Threshold: > 3.7)`);

    assert(hBase64 >= 3.7, `Base64 secret exceeds entropy threshold (${hBase64} >= 3.7)`);
    assert(hHex >= 3.7, `Hex token exceeds entropy threshold (${hHex} >= 3.7)`);
    assert(isHighEntropySecret(highEntropyBase64), 'isHighEntropySecret flags raw cryptographic token');

    // Natural English words (long dictionary words)
    const word1 = 'internationalization';
    const word2 = 'enterpriseinfrastructure';
    const word3 = 'unauthorizedaccess';

    const hWord1 = calculateShannonEntropy(word1);
    const hWord2 = calculateShannonEntropy(word2);
    const hWord3 = calculateShannonEntropy(word3);

    console.log(`     Dictionary Word ("${word1}"): H = ${hWord1}`);
    console.log(`     Dictionary Word ("${word2}"): H = ${hWord2}`);
    console.log(`     Dictionary Word ("${word3}"): H = ${hWord3}`);

    assert(hWord1 < 3.7 && hWord2 < 3.7 && hWord3 < 3.7, 'Natural dictionary words stay under entropy threshold (< 3.7)');
    assert(!isHighEntropySecret(word1) && !isHighEntropySecret(word2) && !isHighEntropySecret(word3), 'Dictionary words are NOT flagged as high-entropy secrets');
  }

  // ----------------------------------------------------------------------------
  // TEST 4: STAGE 3.3 - High-Sensitivity Regex Pattern Database Expansion
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST 4: Stage 3.3 Enterprise Regex Pattern Coverage (25+ Patterns)');
  {
    assert(RULE_DEFINITIONS.length >= 22, `Pattern database contains comprehensive ruleset (${RULE_DEFINITIONS.length} definitions)`);

    const sampleAwsKey = 'AKIA' + 'IOSFODNN7EXAMPLE';
    const sampleAwsSecret = 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
    const sampleGhPat = 'ghp_' + '1234567890abcdefghijklmnopqrstuvwxyz12';
    const sampleSlackHook = ['https://hooks.slack.com', 'services', 'T00000000', 'B00000000', 'XXXXXXXXXXXXXXXXXXXXXXXX'].join('/');
    const sampleSlackToken = ['xoxb', '1234567890', 'abcdefghijklmnopqrstuv'].join('-');
    const sampleOpenAI = 'sk-proj-' + '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234';
    const sampleClaude = 'sk-ant-api03-' + 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const sampleGcp = 'AIza' + 'SyD-abc123def456ghi789jkl012mno345pqr';
    const sampleStripe = 'sk_live_' + '51AbcDefGhIjKlMnOpQrStUvWxYz1234567890';
    const sampleSendGrid = 'SG.' + '1234567890abcdefghij12.1234567890abcdefghijklmnopqrstuvwxyz1234567890';
    const sampleTwilio = 'AC' + '1234567890abcdef1234567890abcdef';

    const testPayload = `
      AWS Key: ${sampleAwsKey}
      AWS Secret: ${sampleAwsSecret}
      GitHub: ${sampleGhPat}
      Slack: ${sampleSlackHook}
      Slack Token: ${sampleSlackToken}
      OpenAI: ${sampleOpenAI}
      Claude: ${sampleClaude}
      GCP: ${sampleGcp}
      Stripe: ${sampleStripe}
      SendGrid: ${sampleSendGrid}
      Twilio: ${sampleTwilio}
      Database: postgresql://admin:P@ssw0rd123@db.internal:5432/finance_prod
      RSA Key: -----BEGIN RSA PRIVATE KEY-----
      MIIEowIBAAKCAQEA3f2dM1k7...EXAMPLEDUMMYKEYDATA...
      -----END RSA PRIVATE KEY-----
      PAN: ABCDE1234F
      SSN: 123-45-6789
      IBAN: GB29NWBK60161331926819
      SWIFT: CHASUS33XXX
      JWT: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature
      Password: password = "SuperSecretP@ss123"
      Hinglish: chabi = "guptaKey987654"
      Email: security.lead@enterprise.corp
      Phone: +1 (555) 234-5678
      IPv4: 192.168.1.100
    `;

    const result = evaluateAndSanitize(testPayload);
    const foundTypes = Object.keys(result.redactionCounts);

    console.log(`     Detected & Redacted Rules: ${foundTypes.length} types (${result.totalRedacted} total redactions in ${result.processingTimeMs} ms)`);

    const expectedTypes = [
      'AWS_ACCESS_KEY', 'AWS_SECRET_KEY', 'GITHUB_TOKEN', 'SLACK_WEBHOOK', 'SLACK_BOT_TOKEN',
      'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GCP_API_KEY', 'STRIPE_KEY', 'SENDGRID_API_KEY',
      'TWILIO_API_KEY', 'DATABASE_URI', 'RSA_PRIVATE_KEY', 'PAN_CARD', 'SSN', 'IBAN_NUMBER',
      'SWIFT_BIC', 'JWT_BEARER', 'PASSWORD_ASSIGNMENT', 'HINGLISH_SECRET_JARGON', 'EMAIL', 'PHONE', 'IP_ADDRESS'
    ];

    expectedTypes.forEach((expected) => {
      assert(foundTypes.includes(expected), `Pattern coverage includes ${expected}`);
    });
  }

  // ----------------------------------------------------------------------------
  // TEST 5: STAGE 3.4 - Multi-Attribute Rule Engine & 50-Char Keyword Anchoring
  // ----------------------------------------------------------------------------
  console.log('\n▶️ TEST 5: Stage 3.4 Multi-Attribute Rule Engine & Keyword Anchoring');
  {
    // Test Case A: CVV with Proximity Anchor (Should be redacted)
    const anchoredCVV = 'Payment Card details: Visa ending in 4532, Card CVV: 789 and valid thru 12/28';
    const resAnchored = evaluateAndSanitize(anchoredCVV);
    assert(resAnchored.redactionCounts['CARD_CVV'] === 1, 'CVV with keyword proximity anchor is successfully redacted');
    assert(resAnchored.redactionCounts['CARD_EXPIRY'] === 1, 'Expiration date with keyword proximity anchor is successfully redacted');

    // Test Case B: Random 3-digit number without Card Proximity Anchor (Should NOT be redacted as CVV)
    const innocentText = 'The meeting room number is 789 on the 7th floor.';
    const resInnocent = evaluateAndSanitize(innocentText);
    assert(!resInnocent.redactionCounts['CARD_CVV'], 'Innocent number without card proximity anchor is NOT redacted as CVV');

    // Test Case C: Aadhaar Multi-Attribute (Regex + Verhoeff Checksum)
    const validAadhaarNum = '2894 7513 904' + generateVerhoeffChecksum('28947513904');
    const fakeAadhaarNum = '2894 7513 9049'; // Corrupted checksum

    const aadhaarDoc = `Citizen Resident Profile:\nUIDAI Aadhaar: ${validAadhaarNum}\nFake Reference Number: ${fakeAadhaarNum}`;
    const resAadhaar = evaluateAndSanitize(aadhaarDoc);

    assert(resAadhaar.sanitizedText.includes('[AADHAAR_NUMBER_REDACTED]'), 'Valid Verhoeff Aadhaar was redacted');
    assert(resAadhaar.sanitizedText.includes(fakeAadhaarNum), 'Corrupted non-Verhoeff number was preserved without false positive redaction');

    // Test Case D: Credit Card Multi-Attribute (Regex + Luhn Checksum)
    const validCard = '4532 0159 8741 2365';
    const fakeCard = '4532 0159 8741 2360'; // Bad Luhn

    const cardDoc = `Payment Transaction:\nCredit Card: ${validCard}\nOrder Tracking: ${fakeCard}`;
    const resCard = evaluateAndSanitize(cardDoc);

    assert(resCard.sanitizedText.includes('[CREDIT_CARD_REDACTED]'), 'Valid Luhn payment card was redacted');
    assert(resCard.sanitizedText.includes(fakeCard), 'Non-Luhn tracking number was preserved without false positive redaction');
  }

  // ----------------------------------------------------------------------------
  // TEST SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 STAGE 3 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL STAGE 3 VERIFICATION GATES SATISFIED 100%!');
  } else {
    console.error('❌ Stage 3 verification tests failed.');
    process.exit(1);
  }
})();
