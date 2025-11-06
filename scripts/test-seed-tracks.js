#!/usr/bin/env node
// Test SEED_TRACKS parsing logic

// Copy loadSeedTracks function from daily-song.js
function loadSeedTracks(raw) {
  if (!raw.trim()) return [];
  
  const ids = new Set();
  
  // Regex pro URL: /track/([A-Za-z0-9]{22})
  const urlMatches = raw.matchAll(/track\/([A-Za-z0-9]{22})/g);
  for (const match of urlMatches) {
    ids.add(match[1]);
  }
  
  // Regex pro bare IDs: ^[A-Za-z0-9]{22}$
  const tokens = raw.split(/[\s,]+/);
  for (const token of tokens) {
    const trimmed = token.trim();
    if (/^[A-Za-z0-9]{22}$/.test(trimmed)) {
      ids.add(trimmed);
    }
  }
  
  // Dedupe, cap to 100
  return Array.from(ids).slice(0, 100);
}

// Test cases
const tests = [
  {
    name: "Empty string",
    input: "",
    expected: 0
  },
  {
    name: "Single URL",
    input: "https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk",
    expected: 1,
    expectedIds: ["6usohdchdzW9oML7VC4Uhk"]
  },
  {
    name: "Multiple URLs (comma)",
    input: "https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk,https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr",
    expected: 2
  },
  {
    name: "Multiple URLs (newline)",
    input: `https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk
https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr
https://open.spotify.com/track/0yLdNVWF3Srea0uzk55zFn`,
    expected: 3
  },
  {
    name: "Bare IDs",
    input: "6usohdchdzW9oML7VC4Uhk 1BxfuPKGuaTgP7aM0Bbdwr 0yLdNVWF3Srea0uzk55zFn",
    expected: 3
  },
  {
    name: "Mixed formats",
    input: `https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk,
1BxfuPKGuaTgP7aM0Bbdwr
https://open.spotify.com/track/0yLdNVWF3Srea0uzk55zFn
3Wrjm47oTz2sjIgck11l5e`,
    expected: 4
  },
  {
    name: "Duplicates removed",
    input: "6usohdchdzW9oML7VC4Uhk,6usohdchdzW9oML7VC4Uhk,1BxfuPKGuaTgP7aM0Bbdwr",
    expected: 2
  },
  {
    name: "Invalid IDs ignored",
    input: "6usohdchdzW9oML7VC4Uhk,short,1BxfuPKGuaTgP7aM0Bbdwr,toolonggggggggggggggggg",
    expected: 2
  },
  {
    name: "100+ IDs capped",
    input: Array.from({length: 150}, (_, i) => {
      // Generate unique 22-char IDs
      const base = i.toString().padStart(22, '0');
      return base.slice(0, 22);
    }).join(','),
    expected: 100
  }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const result = loadSeedTracks(test.input);
  const success = result.length === test.expected;
  
  if (success) {
    console.log(`✓ ${test.name} (${result.length} IDs)`);
    if (test.expectedIds) {
      const idsMatch = test.expectedIds.every(id => result.includes(id));
      if (idsMatch) {
        console.log(`  IDs match: ${result.join(', ')}`);
      } else {
        console.log(`  ⚠ IDs mismatch: expected ${test.expectedIds.join(', ')}, got ${result.join(', ')}`);
      }
    }
    passed++;
  } else {
    console.log(`✗ ${test.name}`);
    console.log(`  Expected: ${test.expected}, Got: ${result.length}`);
    console.log(`  IDs: ${result.join(', ')}`);
    failed++;
  }
});

console.log(`\n${passed}/${tests.length} tests passed`);
process.exit(failed > 0 ? 1 : 0);
