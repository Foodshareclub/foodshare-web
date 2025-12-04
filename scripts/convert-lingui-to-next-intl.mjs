#!/usr/bin/env node
/**
 * Convert Lingui .po files to next-intl JSON format
 *
 * Usage: node scripts/convert-lingui-to-next-intl.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Supported locales from lingui.config.js
const LOCALES = [
  'en', 'cs', 'de', 'es', 'fr', 'pt', 'ru', 'uk',
  'zh', 'hi', 'ar', 'it', 'pl', 'nl', 'ja', 'ko', 'tr'
];

const INPUT_DIR = join(ROOT, 'src/locales');
const OUTPUT_DIR = join(ROOT, 'messages');

/**
 * Parse a .po file and extract msgid/msgstr pairs
 */
function parsePo(content) {
  const messages = {};
  const lines = content.split('\n');

  let currentMsgid = null;
  let currentMsgstr = null;
  let inMsgid = false;
  let inMsgstr = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines for now (but we already passed header)
    if (trimmed.startsWith('#') || trimmed === '') {
      // Reset state on empty line if we have a complete pair
      if (trimmed === '' && currentMsgid !== null && currentMsgstr !== null) {
        if (currentMsgid !== '' && currentMsgstr !== '') {
          messages[currentMsgid] = currentMsgstr;
        }
        currentMsgid = null;
        currentMsgstr = null;
        inMsgid = false;
        inMsgstr = false;
      }
      continue;
    }

    // Handle msgid
    if (trimmed.startsWith('msgid ')) {
      inMsgid = true;
      inMsgstr = false;
      // Extract the string value
      const match = trimmed.match(/^msgid\s+"(.*)"/);
      currentMsgid = match ? match[1] : '';
      continue;
    }

    // Handle msgstr
    if (trimmed.startsWith('msgstr ')) {
      inMsgstr = true;
      inMsgid = false;
      const match = trimmed.match(/^msgstr\s+"(.*)"/);
      currentMsgstr = match ? match[1] : '';
      continue;
    }

    // Handle continuation lines (multiline strings)
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      const value = trimmed.slice(1, -1);
      if (inMsgid && currentMsgid !== null) {
        currentMsgid += value;
      } else if (inMsgstr && currentMsgstr !== null) {
        currentMsgstr += value;
      }
    }
  }

  // Handle last pair if file doesn't end with empty line
  if (currentMsgid !== null && currentMsgstr !== null && currentMsgid !== '' && currentMsgstr !== '') {
    messages[currentMsgid] = currentMsgstr;
  }

  return messages;
}

/**
 * Create a safe key from message text
 * Converts "Hello World!" to "hello_world"
 */
function createKey(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, '') // Trim underscores
    .slice(0, 100); // Limit length
}

/**
 * Convert lingui placeholder format to ICU format
 * Lingui uses {0}, {1}, {name} etc.
 * next-intl uses {0}, {1}, {name} (same format!)
 */
function convertPlaceholders(text) {
  // Lingui and next-intl both use ICU format, so no conversion needed
  return text;
}

/**
 * Build a key mapping from English messages
 */
function buildKeyMapping(enMessages) {
  const keyMap = new Map();
  const usedKeys = new Set();

  for (const [msgid] of Object.entries(enMessages)) {
    let key = createKey(msgid);

    // Handle duplicates by appending number
    if (!key) key = 'message';
    let finalKey = key;
    let counter = 1;
    while (usedKeys.has(finalKey)) {
      finalKey = `${key}_${counter}`;
      counter++;
    }

    usedKeys.add(finalKey);
    keyMap.set(msgid, finalKey);
  }

  return keyMap;
}

/**
 * Convert messages to next-intl format using key mapping
 */
function convertMessages(messages, keyMap, isEnglish) {
  const result = {};

  for (const [msgid, msgstr] of Object.entries(messages)) {
    const key = keyMap.get(msgid);
    if (key) {
      // Use msgstr (translated) for non-English, msgid (source) for English as fallback if empty
      const value = msgstr || (isEnglish ? msgid : '');
      if (value) {
        result[key] = convertPlaceholders(value);
      }
    }
  }

  return result;
}

/**
 * Also export a reverse mapping for migration helper
 */
function exportMigrationHelper(enMessages, keyMap) {
  const helper = {};

  for (const [msgid] of Object.entries(enMessages)) {
    const key = keyMap.get(msgid);
    if (key) {
      helper[msgid] = key;
    }
  }

  return helper;
}

async function main() {
  console.log('Converting Lingui .po files to next-intl JSON format...\n');

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // First, parse English messages to build key mapping
  const enPoPath = join(INPUT_DIR, 'en/messages.po');
  if (!existsSync(enPoPath)) {
    console.error('English .po file not found:', enPoPath);
    process.exit(1);
  }

  const enContent = readFileSync(enPoPath, 'utf-8');
  const enMessages = parsePo(enContent);
  console.log(`Found ${Object.keys(enMessages).length} messages in English`);

  // Build key mapping from English
  const keyMap = buildKeyMapping(enMessages);

  // Convert and save each locale
  for (const locale of LOCALES) {
    const poPath = join(INPUT_DIR, `${locale}/messages.po`);

    if (!existsSync(poPath)) {
      console.log(`  Skipping ${locale} - no .po file found`);
      continue;
    }

    const content = readFileSync(poPath, 'utf-8');
    const messages = parsePo(content);
    const converted = convertMessages(messages, keyMap, locale === 'en');

    const outputPath = join(OUTPUT_DIR, `${locale}.json`);
    writeFileSync(outputPath, JSON.stringify(converted, null, 2), 'utf-8');

    console.log(`  ${locale}: ${Object.keys(converted).length} messages -> ${outputPath}`);
  }

  // Export migration helper (maps original text to new key)
  const helperPath = join(OUTPUT_DIR, '_migration-helper.json');
  const helper = exportMigrationHelper(enMessages, keyMap);
  writeFileSync(helperPath, JSON.stringify(helper, null, 2), 'utf-8');
  console.log(`\nMigration helper saved to: ${helperPath}`);

  console.log('\nConversion complete!');
  console.log('\nNext steps:');
  console.log('1. Create src/i18n/request.ts for next-intl config');
  console.log('2. Update middleware.ts for locale routing');
  console.log('3. Update providers.tsx with NextIntlClientProvider');
  console.log('4. Update components to use useTranslations() hook');
}

main().catch(console.error);
