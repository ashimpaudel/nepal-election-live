# 🌐 Translation Contribution Guide

Thank you for helping translate the Nepal Election LIVE dashboard! Nepal's constitution recognizes 124 national languages, and we want to make this tool accessible to everyone.

## Currently Supported Languages (7)

| Code | Language | Script | Status |
|------|----------|--------|--------|
| `en` | English | Latin | ✅ Complete |
| `ne` | Nepali (नेपाली) | Devanagari | ✅ Complete |
| `mai` | Maithili (मैथिली) | Devanagari | 🔶 Partial |
| `bho` | Bhojpuri (भोजपुरी) | Devanagari | 🔶 Partial |
| `thr` | Tharu (थारु) | Devanagari | 🔶 Partial |
| `tam` | Tamang (तामाङ) | Devanagari | 🔶 Partial |
| `new` | Nepal Bhasa (नेवारी) | Devanagari | 🔶 Partial |

## How to Add a New Language

### 1. Create the translation file

Copy `frontend/src/i18n/en.json` to `frontend/src/i18n/{code}.json` where `{code}` is the ISO 639 language code.

```bash
cp frontend/src/i18n/en.json frontend/src/i18n/{code}.json
```

### 2. Translate the strings

Open the new file and translate each value (NOT the keys). For example:

```json
{
  "common": {
    "home": "Your translation here",
    "live": "Your translation here"
  }
}
```

**Guidelines:**
- Keep translations concise — UI space is limited
- Use the appropriate script for your language
- Keep number formats in the local style where appropriate
- If unsure about a term, leave the English version and add a comment

### 3. Register the language

Edit `frontend/src/i18n/config.ts` and add your language code:

```typescript
export const locales = ["en", "ne", "mai", "bho", "thr", "tam", "new", "YOUR_CODE"] as const;

export const localeNames: Record<Locale, string> = {
  // ...existing...
  YOUR_CODE: "Language Name in Native Script",
};
```

### 4. Submit a Pull Request

1. Fork the repository
2. Create a branch: `git checkout -b i18n/add-{language-name}`
3. Add your translation file and config changes
4. Submit a PR with the title: `i18n: Add {Language Name} translation`

### Translation Key Reference

See `frontend/src/i18n/en.json` for the complete list of translation keys. The main sections are:

- `common` — Shared UI terms (home, search, loading, etc.)
- `header` — Top navigation bar
- `summary` — Election summary statistics
- `parties` — Party results table
- `pr` — Proportional representation section
- `constituency` — Constituency results
- `seatBar` — Seat distribution visualization
- `status` — Election status labels
- `disclaimer` — Legal disclaimer text
- `language` — Language names in the switcher

## Questions?

Open an issue with the `i18n` label, or reach out in the Discussions tab.
