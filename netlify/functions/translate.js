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
  // Fráze (delší musí být první)
  [/no\s+cap/gi, 'fakt, bez keců'],
  [/real\s+talk/gi, 'upřímně'],
  [/skill\s+issue/gi, 'problém se schopnostmi'],
  [/hard\s+carry/gi, 'táhnout tým'],
  [/hard\s+W/gi, 'velké vítězství'],
  [/on\s+point/gi, 'přesné'],
  [/low\s+effort/gi, 'nízké úsilí'],
  [/not\s+it/gi, 'špatné'],
  [/let\s+(him|her|them)\s+cook/gi, 'nech ho/ji tvořit'],
  [/ate\s+and\s+left\s+no\s+crumbs/gi, 'udělal skvěle'],
  [/hits\s+different/gi, 'jinak působí'],
  [/brain\s+rot/gi, 'hniloba mozku'],
  [/red\s+flag/gi, 'varovný signál'],
  [/green\s+flag/gi, 'pozitivní signál'],
  [/beige\s+flag/gi, 'neutrální signál'],
  [/black\s+cat/gi, 'chladná energie'],
  [/golden\s+retriever/gi, 'milý člověk'],
  [/dad\s+joke/gi, 'trapný vtip'],
  [/girl\s+dinner/gi, 'snacky'],
  [/girl\s+math/gi, 'ženská logika'],
  [/white\s+girl\s+music/gi, 'Taylor Swift'],
  [/death\s+stare/gi, 'mrtvolný pohled'],
  [/side\s+eye/gi, 'boční oko'],
  [/fit\s+check/gi, 'ukázka outfitu'],
  [/photo\s+dump/gi, 'více fotek'],
  [/resting\s+bitch\s+face/gi, 'odsuzující pohled'],
  [/roman\s+empire/gi, 'neustále přemýšlet'],
  [/passenger\s+princess/gi, 'král na místě spolujezdce'],
  [/pick\s+me\s+girl/gi, 'holka shazující jiné'],
  [/sugar\s+(baby|daddy|mamma)/gi, 'dotovaný vztah'],
  [/thirst\s+trap/gi, 'svůdná fotka'],
  [/turn\s+on/gi, 'přitažlivé'],
  [/turn\s+off/gi, 'nepřitažlivé'],
  [/spill\s+the\s+tea/gi, 'řekni drby'],
  [/sip\s+tea/gi, 'hltání drbů'],
  [/smash\s+or\s+pass/gi, 'ano nebo ne'],
  [/netflix\s+and\s+chill/gi, 'sex'],
  [/sweet\s+treat/gi, 'dezertík'],
  [/chicken\s+legs/gi, 'slabé nohy'],
  [/academic\s+victim/gi, 'učení nejde'],
  [/academic\s+weapon/gi, 'dobrý ve škole'],
  [/built\s+different/gi, 'talentovaný'],
  [/coping\s+mechanism/gi, 'způsob vyrovnání'],
  
  // Verbs (českočeská Gen-Z slovesa)
  [/fixnout/gi, 'opravit'],
  [/buffnout/gi, 'posílit'],
  [/nerfnout/gi, 'oslabit'],
  [/shipnout/gi, 'vydat'],
  [/rerollnout/gi, 'zkusit znovu'],
  [/locknout/gi, 'uzamknout'],
  [/pushnout/gi, 'poslat'],
  [/deploynout/gi, 'nasadit'],
  [/ghostnout/gi, 'ignorovat'],
  [/cancelnout/gi, 'zrušit'],
  [/dropnout/gi, 'pustit'],
  [/grindit/gi, 'dřít'],
  [/resetnout/gi, 'resetovat'],
  [/pingnout/gi, 'ozvat se'],
  [/syncnout/gi, 'synchronizovat'],
  [/booknout/gi, 'zarezervovat'],
  [/checkuju|checknout/gi, 'zkontrolovat'],
  [/chillovat/gi, 'relaxovat'],
  [/cringovat/gi, 'být trapný'],
  [/edgovat/gi, 'napínat'],
  [/feelovat/gi, 'cítit'],
  [/felit/gi, 'posedět'],
  [/flexit/gi, 'předvádět se'],
  [/ghosting/gi, 'ignorování'],
  [/gaslighting/gi, 'manipulace'],
  [/gatekeep/gi, 'kontrolovat přístup'],
  [/shipovat/gi, 'podporovat vztah'],
  [/trolling/gi, 'provokování'],
  [/vyghostit/gi, 'ignorovat'],
  [/yapping/gi, 'žvatlat'],
  [/ch(á|a)lovat/gi, 'jíst'],
  [/tahat\s+se/gi, 'vídat se'],
  
  // Tones & slang
  [/\baf\b/gi, 'extrémně'],
  [/banger/gi, 'hit'],
  [/bestie/gi, 'nejlepší kámoš'],
  [/boomer/gi, 'starší generace'],
  [/\bbae\b/gi, 'miláček'],
  [/baller/gi, 'úspěšný'],
  [/ballin/gi, 'luxusní život'],
  [/baddie/gi, 'drsná žena'],
  [/bombex/gi, 'super'],
  [/boujee|bougie/gi, 'luxusní'],
  [/\bbro\b/gi, 'brácho'],
  [/\bbruh\b/gi, 'kámo'],
  [/cancelled/gi, 'zrušený'],
  [/classy/gi, 'elegantní'],
  [/crush/gi, 'zamilování'],
  [/delulu/gi, 'mimo realitu'],
  [/deg(e)?š/gi, 'hloupý'],
  [/dope/gi, 'super'],
  [/skibidi/gi, 'divné'],
  [/bussin['"]?/gi, 'výborné'],
  [/rizz/gi, 'charisma'],
  [/based/gi, 'autentické'],
  [/slay/gi, 'perfektní'],
  [/cringe/gi, 'trapné'],
  [/vibe(s)?/gi, 'nálada'],
  [/toxic/gi, 'toxické'],
  [/\btea\b/gi, 'drby'],
  [/peak/gi, 'vrchol'],
  [/clean/gi, 'čisté'],
  [/solid/gi, 'solidní'],
  [/sleek/gi, 'elegantní'],
  [/smooth/gi, 'hladké'],
  [/crisp/gi, 'ostré'],
  [/\bgas\b/gi, 'super'],
  [/\bsus\b/gi, 'podezřelé'],
  [/yikes/gi, 'fuj'],
  [/\bdead\b/gi, 'mrtvé'],
  [/trash/gi, 'špatné'],
  [/iffy/gi, 'nejisté'],
  [/\boff\b/gi, 'divné'],
  [/overkill/gi, 'přehnané'],
  [/\bpain\b/gi, 'bolest'],
  [/cope/gi, 'vyrovnávání'],
  [/doom/gi, 'záhuba'],
  [/\bnah\b/gi, 'ne'],
  [/basic/gi, 'základní'],
  [/lukewarm/gi, 'vlažné'],
  [/\blite\b/gi, 'lehké'],
  [/standard/gi, 'standardní'],
  [/neutral/gi, 'neutrální'],
  [/average/gi, 'průměrné'],
  [/whatever/gi, 'cokoli'],
  [/lit/gi, 'skvělé'],
  [/fire/gi, 'super'],
  [/drip/gi, 'styl'],
  [/goat/gi, 'nejlepší'],
  [/\bmid\b/gi, 'průměrné'],
  [/valid/gi, 'dobré'],
  [/\bL\b/g, 'prohra'],
  [/\bW\b/g, 'výhra'],
  [/goated/gi, 'legendární'],
  [/kino/gi, 'filmové'],
  [/heat/gi, 'žhavé'],
  [/mega/gi, 'hodně'],
  [/\bcap\b/gi, 'lež'],
  [/\bfr\b/gi, 'vážně'],
  [/\bngl\b/gi, 'upřímně'],
  [/\bidk\b/gi, 'nevím'],
  [/\bimo\b/gi, 'podle mě'],
  [/\bbtw\b/gi, 'mimochodem'],
  [/\bfyi\b/gi, 'pro info'],
  [/\birl\b/gi, 'v reálu'],
  [/lowkey/gi, 'trochu'],
  [/highkey/gi, 'hodně'],
  [/k(á|a)mo/gi, 'kamaráde'],
  [/ch(á|a)br/gi, 'brácha'],
  [/\bchad\b/gi, 'alfa samec'],
  [/ch(á|a)lka/gi, 'jídlo'],
  [/fel(á|a)ci/gi, 'kámoši'],
  [/fail/gi, 'neúspěch'],
  [/\bflop\b/gi, 'neúspěch'],
  [/\bflex\b/gi, 'chlubit se'],
  [/fame/gi, 'slavný'],
  [/fancy/gi, 'noblesní'],
  [/\bfit\b/gi, 'outfit'],
  [/fomo/gi, 'strach zmeškat'],
  [/fruity/gi, 'ne úplně hetero'],
  [/girlboss/gi, 'úspěšná žena'],
  [/glow[\-\s]?up/gi, 'změna k lepšímu'],
  [/glow[\-\s]?down/gi, 'změna k horšímu'],
  [/goofy/gi, 'bláznivý'],
  [/gymrat/gi, 'závislý na cvičení'],
  [/highlight/gi, 'vrchol'],
  [/\bhoe\b/gi, 'lehká dívka'],
  [/\bhot\b/gi, 'atraktivní'],
  [/\bhuh\b/gi, 'co?'],
  [/\bick\b/gi, 'odpudivé'],
  [/imagine/gi, 'představ si'],
  [/its\s+giving/gi, 'vypadá skvěle'],
  [/karen/gi, 'protivná žena'],
  [/legit/gi, 'doopravdy'],
  [/\bmatch\b/gi, 'padnout si'],
  [/\bmeh\b/gi, 'nic moc'],
  [/\bmood\b/gi, 'nálada'],
  [/mother(ing)?/gi, 'královna'],
  [/nefeelovat/gi, 'necítím to'],
  [/niche/gi, 'unikátní'],
  [/\bnope\b/gi, 'ne'],
  [/period/gi, 'tečka'],
  [/puff(í|i)k/gi, 'vape'],
  [/pregame/gi, 'pít před akcí'],
  [/\bqueen\b/gi, 'královna'],
  [/savage/gi, 'divošské'],
  [/\bscam\b/gi, 'podvod'],
  [/serving/gi, 'vypadat skvěle'],
  [/shady/gi, 'podezřelé'],
  [/\bship\b/gi, 'párovat'],
  [/shoutout/gi, 'vyzdvihnutí'],
  [/\bsimp\b/gi, 'submisivní muž'],
  [/situationship/gi, 'vztah nevztah'],
  [/\bskip\b/gi, 'vynechat'],
  [/snowflake/gi, 'přecitlivělý'],
  [/\bstan\b/gi, 'posedlý fanoušek'],
  [/solulu/gi, 'řešení'],
  [/swag/gi, 'styl'],
  [/\btrigger\b/gi, 'spouštěč'],
  [/vanilla/gi, 'nudné'],
  [/\bwack\b/gi, 'nudný'],
  [/weirdo/gi, 'podivín'],
  [/\bwoke\b/gi, 'politicky korektní'],
  [/\byass\b/gi, 'ano'],
  [/zaddy/gi, 'sexy starší muž'],
  [/eboy|egirl/gi, 'emo styl'],
  [/finsta/gi, 'falešný Instagram'],
  [/setup/gi, 'nastavení'],
  [/\bflow\b/gi, 'tok'],
  [/grind/gi, 'dřina'],
  [/energy/gi, 'energie'],
  [/stack/gi, 'vrstva'],
  [/buff/gi, 'posílení'],
  [/nerf/gi, 'oslabení'],
  [/clout/gi, 'vliv'],
  [/brain/gi, 'mozek'],
  [/focus/gi, 'soustředění'],
  [/deadline/gi, 'termín'],
  [/scope/gi, 'rozsah'],
  [/context/gi, 'kontext'],
  [/cooldown/gi, 'pauza'],
  [/overhead/gi, 'náklad'],
  [/latence/gi, 'zpoždění'],
  [/momentum/gi, 'rozjezd'],
  [/checkpoint/gi, 'kontrolní bod'],
  [/sigma/gi, 'nezávislý samotář'],
  [/shitpost/gi, 'nesmyslný příspěvek'],
  [/bodyshaming/gi, 'urážení těla'],
  [/chicago/gi, 'místo pohody']
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

  // Gen-Z → normální - aplikuj všechny nahrazení
  for (const [re, rep] of G2N) {
    out = out.replace(re, rep);
  }

  // Vyčisti vatu „skibidi" co zbylo
  out = out.replace(/\bskibidi\b/gi, '');
  
  // kosmetika
  out = out
    .replace(/\s{2,}/g, ' ')
    .trim();

  return out || text; // vrať originál pokud je výsledek prázdný
}
