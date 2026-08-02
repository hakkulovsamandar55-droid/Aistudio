// Style presets the user picks from in the UI. Each preset contributes a
// `promptSuffix` that is appended to the enhanced prompt before it reaches
// the provider, so users get a distinct look without writing prompt-speak
// themselves — that's the whole promise of the product.
//
// `id` values are stored on Generation.style, so renaming one is a data
// migration; add new presets instead of repurposing existing ids.

const IMAGE_STYLES = [
  {
    id: 'auto',
    label: 'Avtomatik',
    emoji: '✨',
    promptSuffix: '',
  },
  {
    id: 'photorealistic',
    label: 'Fotorealistik',
    emoji: '📷',
    promptSuffix:
      'photorealistic, ultra detailed, 8k resolution, professional photography, natural lighting, sharp focus, shot on DSLR',
  },
  {
    id: 'anime',
    label: 'Anime',
    emoji: '🎌',
    promptSuffix:
      'anime style, cel shading, vibrant saturated colors, clean line art, expressive character design, studio quality',
  },
  {
    id: 'digital_art',
    label: "Raqamli san'at",
    emoji: '🎨',
    promptSuffix:
      'digital painting, concept art, trending on artstation, dramatic lighting, rich color palette, highly detailed',
  },
  {
    id: 'render_3d',
    label: '3D render',
    emoji: '🧊',
    promptSuffix:
      '3D render, octane render, ray tracing, soft studio lighting, subsurface scattering, high poly, cinematic depth of field',
  },
  {
    id: 'oil_painting',
    label: "Moybo'yoq",
    emoji: '🖼️',
    promptSuffix:
      'oil painting on canvas, visible brush strokes, rich impasto texture, classical composition, warm tones',
  },
  {
    id: 'cyberpunk',
    label: 'Kiberpank',
    emoji: '🌃',
    promptSuffix:
      'cyberpunk aesthetic, neon lighting, rain slicked streets, holographic signage, moody atmosphere, blade runner inspired',
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    emoji: '⬜',
    promptSuffix:
      'minimalist design, flat vector illustration, simple geometric shapes, generous negative space, limited color palette',
  },
  {
    id: 'watercolor',
    label: 'Akvarel',
    emoji: '💧',
    promptSuffix:
      'watercolor painting, soft bleeding pigments, textured paper, delicate washes, hand painted feel',
  },
];

const VIDEO_STYLES = [
  {
    id: 'auto',
    label: 'Avtomatik',
    emoji: '✨',
    promptSuffix: '',
  },
  {
    id: 'cinematic',
    label: 'Kino',
    emoji: '🎬',
    promptSuffix:
      'cinematic shot, anamorphic lens, shallow depth of field, film grain, dramatic color grading, smooth camera movement',
  },
  {
    id: 'documentary',
    label: 'Hujjatli',
    emoji: '🎥',
    promptSuffix:
      'documentary style, handheld camera, natural lighting, realistic motion, observational framing',
  },
  {
    id: 'animation',
    label: 'Animatsiya',
    emoji: '🧸',
    promptSuffix:
      '3D animated film style, stylized characters, expressive motion, colorful lighting, pixar inspired',
  },
  {
    id: 'timelapse',
    label: 'Taymlaps',
    emoji: '⏱️',
    promptSuffix: 'timelapse, accelerated motion, shifting light over time, static locked camera, long exposure trails',
  },
  {
    id: 'drone',
    label: 'Dron',
    emoji: '🚁',
    promptSuffix:
      'aerial drone shot, sweeping camera movement, wide establishing view, smooth gimbal stabilization, epic scale',
  },
];

function getStyles(type) {
  return type === 'VIDEO' ? VIDEO_STYLES : IMAGE_STYLES;
}

/**
 * Returns the preset for `styleId`, or null when it's unknown/absent.
 * Unknown ids are treated as "no style" rather than an error so an outdated
 * client can never block a generation.
 */
function findStyle(type, styleId) {
  if (!styleId) return null;
  return getStyles(type).find((style) => style.id === styleId) || null;
}

function applyStyle(prompt, type, styleId) {
  const style = findStyle(type, styleId);
  if (!style || !style.promptSuffix) return prompt;
  return `${prompt}, ${style.promptSuffix}`;
}

module.exports = { IMAGE_STYLES, VIDEO_STYLES, getStyles, findStyle, applyStyle };
