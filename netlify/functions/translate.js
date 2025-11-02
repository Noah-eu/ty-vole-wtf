// netlify/functions/translate.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method not allowed' });
  }

  try {
    const { text, direction } = JSON.parse(event.body || '{}');
    if (!text || typeof text !== 'string') {
      return resp(400, { error: 'Missing text' });
    }

    const dir = (direction || '').toLowerCase();

    if (dir === 'normal_to_gz') {
      return resp(200, { translated: toGenZ(text) });
    } else if (dir === 'gz_to_normal') {
      return resp(200, { translated: toNormal(text) });
    } else {
      // default: zkusi obě a vrátí lepší
      const gz = toGenZ(text);
      return resp(200, { translated: gz });
    }
  } catch (e) {
    return resp(500, { error: 'Server error', detail: String(e) });
  }
}

function resp(code, obj) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj)
  };
}

// --- Slovníky ---
// Pozor na „skibidi“: filler/vata, někdy „trapné/bez obsahu“
const N2G = [
  // významové výrazy
  [/trapn(é|y|a|o)/gi, 'cringe'],
  [/\bprůměr(n|ně|ný)?\b/gi, 'mid'],
  [/\bšpatn(é|y|á|ě)\b/gi, 'L'],
  [/\bskvěl(é|ý|á)\b/gi, 'based'],
  [/\bstyl|stylový|vzhled|móda\b/gi, 'drip'],
  [/\bsebevědomí|šarm|charisma\b/gi, 'rizz'],
  [/\bplán|nápad\b/gi, 'gameplan'],

  // časté fráze
  [/\bto je dobré\b/gi, 'valid'],
  [/\bto je špatné\b/gi, 'yikes'],
  [/\bnevím\b/gi, 'idk'],
  [/\bopravit\b/gi, 'fixnout'],
  [/\bodeslat|poslat\b/gi, 'shipnout'],
  [/\breset(nout)?\b/gi, 'reset'],
];

const G2N = [
  [/\bbased\b/gi, 'fakt dobrý'],
  [/\bvalid\b/gi, 'dává smysl'],
  [/\bmid\b/gi, 'průměr'],
  [/\bL\b/g, 'prohra/špatné'],
  [/\bW\b/g, 'výhra/supr'],
  [/\bcringe\b/gi, 'trapné'],
  [/\byikes\b/gi, 'au, nepříjemné'],
  [/\bridz{0,1}z?\b/gi, 'charisma'],
  [/\brizz\b/gi, 'charisma'],
  [/\bdrip\b/gi, 'styl/outfit'],
  [/\bno cap\b/gi, 'fakt'],
  [/\blowkey\b/gi, 'tak trochu/potichu'],
  [/\bhighkey\b/gi, 'na plno/bez skrupulí'],
  [/\bgoat\b/gi, 'legenda/nejlepší'],
  [/\bidk\b/gi, 'nevím'],
  [/\bngl\b/gi, 'upřímně'],
  [/\bfr\b/gi, 'fakt'],
  [/\bgg\b/gi, 'dobrá hra/hotovo'],
  [/\bskibidi\b/gi, 'vata/prostě/jako'],
  [/\bshipnout\b/gi, 'poslat/vydat'],
  [/\bfixnout\b/gi, 'opravit'],
];

// --- Heuristiky pro skibidi ---
function injectSkibidiFiller(text) {
  // když věta začíná váháním – přidáme lehký filler
  const trimmed = text.trim();
  if (/^(no|hele|hmm|tak|ehm)\b/i.test(trimmed)) {
    return 'skibidi… ' + trimmed;
  }
  // nebo když je to moc krátké / suché
  if (trimmed.length < 15) {
    return 'skibidi ' + trimmed;
  }
  return trimmed;
}

function toGenZ(text) {
  let out = text;

  // mapování běžné → Gen-Z
  for (const [re, rep] of N2G) out = out.replace(re, rep);

  // lehké zkrácení „omáčky“
  out = out
    .replace(/\b(totiž|prostě|jako|vlastně|teda)\b/gi, '') // necháme “skibidi” jako novou vatu
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Přidej „skibidi“ jako filler (ale ne všude)
  out = injectSkibidiFiller(out);

  // mix krátkých „tiků“
  out = out
    .replace(/\bvelmi\b/gi, 'mega')
    .replace(/\bopravdu\b/gi, 'fakt');

  // bez otázek
  out = out.replace(/\?+$/,'').trim();

  return out;
}

function toNormal(text) {
  let out = text;

  // nejdřív pryč vata „skibidi“
  out = out.replace(/\bskibidi\b/gi, '').replace(/\s{2,}/g, ' ').trim();

  // Gen-Z → normální
  for (const [re, rep] of G2N) out = out.replace(re, rep);

  // kosmetika
  out = out
    .replace(/\bmega\b/gi, 'hodně')
    .replace(/\bfakt\b/gi, 'opravdu')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return out;
}
