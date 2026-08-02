/**
 * One-click transformation presets for Remix — upload any image, pick a
 * style, get a transformed version. Separate from styles.config.js because
 * these describe an image-to-image *transformation* ("turn this into...")
 * rather than a generation style layered onto a fresh prompt.
 */
const REMIX_STYLES = [
  {
    id: 'anime',
    label: 'Anime',
    icon: 'smile',
    promptSuffix:
      'anime style, cel shading, vibrant colors, clean line art, expressive character design — keep the original composition and subject',
  },
  {
    id: 'pixar',
    label: 'Pixar',
    icon: 'cube',
    promptSuffix:
      '3D animated Pixar-style render, soft rounded features, warm lighting, expressive eyes — keep the original composition and subject',
  },
  {
    id: 'lego',
    label: 'LEGO',
    icon: 'package',
    promptSuffix:
      'LEGO minifigure style, plastic brick texture, blocky proportions, glossy render — keep the original composition and subject',
  },
  {
    id: 'comic',
    label: 'Komiks',
    icon: 'sparkle',
    promptSuffix:
      'comic book style, bold ink outlines, halftone dot shading, dynamic action lines — keep the original composition and subject',
  },
  {
    id: 'gta',
    label: 'GTA',
    icon: 'palette',
    promptSuffix:
      'GTA video game cover art style, painterly poster illustration, high contrast, stylized shading — keep the original composition and subject',
  },
  {
    id: 'realistic',
    label: 'Realistik',
    icon: 'camera',
    promptSuffix:
      'photorealistic, natural lighting, sharp focus, lifelike detail — keep the original composition and subject',
  },
];

function findRemixStyle(styleId) {
  return REMIX_STYLES.find((style) => style.id === styleId) || null;
}

function buildRemixPrompt(styleId) {
  const style = findRemixStyle(styleId);
  const suffix = style ? style.promptSuffix : REMIX_STYLES[0].promptSuffix;
  return `Transform the uploaded image: ${suffix}.`;
}

module.exports = { REMIX_STYLES, findRemixStyle, buildRemixPrompt };
