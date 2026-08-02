const ITextProvider = require('./ITextProvider');

/**
 * Offline stand-in for a real LLM. It is deliberately more than a stub: the
 * Magic Mode and campaign flows are only convincing if the script, caption
 * and hashtag steps produce something readable, so this composes templated
 * output from the user's own idea instead of returning placeholder text.
 *
 * `options.kind` selects the shape; anything unknown falls back to a generic
 * expansion of the prompt.
 */
class MockTextProvider extends ITextProvider {
  async generateText(prompt, options = {}) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    // A real LLM is handed the full instruction ("write a 15s script for X")
    // and follows it. This provider only templates, so it works from the raw
    // subject when the caller supplies one — otherwise the instruction text
    // itself would leak into the output.
    const idea = String(options.subject || prompt).trim();
    const builders = {
      script: () => buildScript(idea),
      caption: () => buildCaption(idea),
      hashtags: () => buildHashtags(idea),
      strategy: () => buildStrategy(idea),
      subtitles: () => buildSubtitles(idea),
    };

    const build = builders[options.kind] || (() => buildScript(idea));
    return { text: build(), provider: 'mock' };
  }
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function keywords(idea) {
  return idea
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6);
}

function buildScript(idea) {
  return [
    `SAHNA 1 — OCHILISH (0-3s)`,
    `Kadr: ${idea}. Yaqin plan, yumshoq yorug'lik, kamera sekin yaqinlashadi.`,
    ``,
    `SAHNA 2 — RIVOJLANISH (3-8s)`,
    `Kadr: ${titleCase(idea)} harakatda ko'rsatiladi. Kamera aylanma harakat qiladi,`,
    `fon detallari ochiladi, ranglar to'yingan.`,
    ``,
    `SAHNA 3 — KULMINATSIYA (8-12s)`,
    `Kadr: Eng ta'sirli lahza. Keng plan, dramatik yorug'lik, sekin harakat.`,
    ``,
    `SAHNA 4 — YAKUN (12-15s)`,
    `Kadr: Logotip yoki chaqiriq matni. Fon qorayadi, musiqa so'nadi.`,
  ].join('\n');
}

function buildCaption(idea) {
  return `${titleCase(idea)} ✨\n\nG'oyani ayting — qolganini AI bajaradi. Siz shunchaki tasavvur qiling, biz yaratamiz.`;
}

function buildHashtags(idea) {
  const base = ['#AIStudio', '#SunUchunAI', '#Kontent', '#Ijod', '#AIvideo', '#Reels'];
  const derived = keywords(idea).map((word) => `#${word}`);
  return [...new Set([...derived, ...base])].slice(0, 12).join(' ');
}

function buildStrategy(idea) {
  return [
    `MAQSAD`,
    `"${idea}" g'oyasi asosida tanilishni oshirish va auditoriya jalb qilish.`,
    ``,
    `AUDITORIYA`,
    `18-35 yosh, mobil qurilmadan foydalanuvchi, vizual kontentni afzal ko'radi.`,
    ``,
    `KANALLAR`,
    `Instagram Reels, TikTok, YouTube Shorts — vertikal 9:16 format.`,
    ``,
    `POST REJASI`,
    `1-kun: qisqa tizer video`,
    `3-kun: asosiy rolik + izoh`,
    `5-kun: sahna ortidagi kadrlar`,
    `7-kun: foydalanuvchi sharhlari`,
    ``,
    `CHAQIRIQ`,
    `Profildagi havola orqali bepul sinab ko'ring.`,
  ].join('\n');
}

function buildSubtitles(idea) {
  return [
    `1`,
    `00:00:00,000 --> 00:00:03,000`,
    titleCase(idea),
    ``,
    `2`,
    `00:00:03,000 --> 00:00:08,000`,
    `G'oyangizni ayting — qolganini AI bajaradi.`,
    ``,
    `3`,
    `00:00:08,000 --> 00:00:12,000`,
    `AI Studio bilan bir daqiqada tayyor kontent.`,
  ].join('\n');
}

module.exports = MockTextProvider;
