#!/usr/bin/env node
// Test cover-cache oEmbed functionality

const TEST_URLS = [
  'https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk', // Teddy Swims - Lose Control
  'https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr', // Taylor Swift - Cruel Summer
  'https://open.spotify.com/track/0yLdNVWF3Srea0uzk55zFn', // Miley Cyrus - Flowers
];

async function testOEmbed(url) {
  try {
    const q = encodeURIComponent(url);
    const response = await fetch(`https://open.spotify.com/oembed?url=${q}`);
    
    if (!response.ok) {
      console.error(`❌ ${url}: HTTP ${response.status}`);
      return null;
    }
    
    const json = await response.json();
    const cover = json?.thumbnail_url || null;
    
    if (cover) {
      console.log(`✅ ${url}`);
      console.log(`   Cover: ${cover.substring(0, 60)}...`);
      return cover;
    } else {
      console.error(`❌ ${url}: No thumbnail_url in response`);
      return null;
    }
  } catch (error) {
    console.error(`❌ ${url}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🧪 Testing Spotify oEmbed API\n');
  
  let success = 0;
  let failed = 0;
  
  for (const url of TEST_URLS) {
    const result = await testOEmbed(url);
    if (result) {
      success++;
    } else {
      failed++;
    }
    console.log('');
  }
  
  console.log(`\n📊 Results: ${success} success, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some oEmbed requests failed. Covers will fallback to placeholder.');
    process.exit(1);
  } else {
    console.log('\n✅ All oEmbed requests successful!');
  }
}

main();
