import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import GUI from 'lil-gui';

const qrcodeFactory = window.qrcode;
if (typeof qrcodeFactory !== 'function') {
  throw new Error('qrcode-generator failed to load.');
}

if (window.__enterpriseQrInitialized) {
  console.warn('[Enterprise QR] Duplicate bootstrap blocked.');
  throw new Error('Enterprise QR is already initialized on this page.');
}
window.__enterpriseQrInitialized = true;

// Safety cleanup for stale dev/runtime mounts so the scene cannot render twice.
document.querySelectorAll('canvas').forEach((node) => node.remove());
document.querySelectorAll('.lil-gui.root').forEach((node) => node.remove());

const QR_REDIRECT_DOMAIN = (() => {
  const configured = String(window.__ENTERPRISE_QR_REDIRECT_DOMAIN__ || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (window.location.hostname.startsWith('qr.')) return `${window.location.origin}/r`;
  return 'https://qr.reynubixvoice.com/r';
})();
const QR_CONFIG_API_BASE = '/api/qr/configs';
const QR_CONFIG_WRITE_TOKEN = String(window.__ENTERPRISE_QR_WRITE_TOKEN__ || '').trim();
const ERROR_CORRECTION_ORDER = { L: 0, M: 1, Q: 2, H: 3 };
const MIN_ENTERPRISE_CONTRAST_RATIO = 7;
const SECRET_KEY_PATTERN = /(token|secret|api[_-]?key|signature|sig|password|auth)/i;

const ENTERPRISE_DEFAULTS = Object.freeze({
  qrSettings: {
    id: '',
    name: 'Enterprise Dynamic QR',
    type: 'dynamic',
    destination: 'https://example.com',
    enabled: true,
    redirect: {
      type: 'single',
      fallbackUrl: '',
      openInNewTab: false
    }
  },
  scanReliability: {
    errorCorrectionLevel: 'H',
    quietZoneModules: 4,
    outputResolution: 4096,
    format: 'SVG',
    marginPixels: 32,
    dpi: 300
  },
  visualSettings: {
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    enableGradient: false,
    gradientStart: '#000000',
    gradientEnd: '#222222',
    logo: {
      enabled: false,
      url: '',
      sizePercent: 18
    },
    shape: {
      modules: 'square',
      corners: 'square'
    },
    border: {
      enabled: true,
      color: '#FFFFFF',
      size: 32
    }
  },
  behaviorSettings: {
    trackScans: true,
    allowRedirectUpdates: true,
    enableAnalytics: true,
    allowExport: true,
    allowDisable: true,
    requireHttps: true
  },
  analyticsSettings: {
    trackUniqueScans: true,
    trackDevice: true,
    trackLocation: true,
    trackTimestamp: true,
    trackReferrer: true
  },
  exportSettings: {
    formats: ['SVG', 'PNG'],
    svgPreferred: true,
    pngSizes: [512, 1024, 2048, 4096]
  },
  securitySettings: {
    dynamicOnly: true,
    allowEditAfterCreate: true,
    requireSecureDestination: true,
    preventClientSideSecrets: true
  }
});

const RENDER_DEFAULTS = {
  baseSize: 20,
  layerDepth: 1.0,
  fineOpacity: 0.4,
  fineDensity: 0.5,
  cutScale: 0.45,
  cutThreshold: 0.5,
  metalness: 1.0,
  roughness: 0.05,
  rotate: true,
  exportFormat: 'SVG',
  exportPngSize: 4096
};

const runtime = {
  currentQR: null,
  analyticsQueue: [],
  dynamicRoutingTable: new Map(),
  lastExport: ''
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) out[key] = deepClone(val);
  return out;
}

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch.map(deepClone);
  if (!isPlainObject(base) || !isPlainObject(patch)) return deepClone(patch);
  const out = deepClone(base);
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else if (Array.isArray(value)) {
      out[key] = value.map(deepClone);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function deepAssign(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      target[key] = value.map(deepClone);
      continue;
    }
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      deepAssign(target[key], value);
      continue;
    }
    target[key] = value;
  }
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `qr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function normalizeHexColor(value, fallback) {
  const hex = String(value ?? '').trim();
  const match = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex);
  if (!match) return fallback;
  const raw = match[1].toUpperCase();
  if (raw.length === 3) return `#${raw.split('').map((c) => c + c).join('')}`;
  return `#${raw}`;
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex, '#000000').slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  const linear = (channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const r = linear(rgb.r);
  const g = linear(rgb.g);
  const b = linear(rgb.b);
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function isHttpsUrl(urlString) {
  try {
    return new URL(String(urlString)).protocol === 'https:';
  } catch {
    return false;
  }
}

function hasSecretLikeData(urlString) {
  try {
    const url = new URL(String(urlString));
    for (const [key] of url.searchParams.entries()) {
      if (SECRET_KEY_PATTERN.test(key)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function enforceEnterpriseStandards(config, { log = true } = {}) {
  const next = deepClone(config);
  const warnings = [];

  if (!next.qrSettings.id) next.qrSettings.id = createId();
  next.qrSettings.name = String(next.qrSettings.name || 'Enterprise Dynamic QR').slice(0, 120);
  next.qrSettings.type = 'dynamic';
  next.qrSettings.enabled = Boolean(next.qrSettings.enabled);

  if (!['single', 'smart', 'conditional'].includes(next.qrSettings.redirect.type)) {
    next.qrSettings.redirect.type = 'single';
    warnings.push('Unsupported redirect type reset to single.');
  }
  next.qrSettings.redirect.openInNewTab = Boolean(next.qrSettings.redirect.openInNewTab);
  next.qrSettings.redirect.fallbackUrl = String(next.qrSettings.redirect.fallbackUrl || '').trim();

  const ecc = String(next.scanReliability.errorCorrectionLevel || 'H').toUpperCase();
  if (!(ecc in ERROR_CORRECTION_ORDER)) {
    next.scanReliability.errorCorrectionLevel = 'H';
    warnings.push('Invalid error correction level reset to H.');
  } else {
    next.scanReliability.errorCorrectionLevel = ERROR_CORRECTION_ORDER[ecc] < ERROR_CORRECTION_ORDER.M ? 'M' : ecc;
    if (ERROR_CORRECTION_ORDER[ecc] < ERROR_CORRECTION_ORDER.M) {
      warnings.push('Error correction below M is blocked by enterprise policy.');
    }
  }
  next.scanReliability.quietZoneModules = Math.max(4, toInteger(next.scanReliability.quietZoneModules, 4));
  next.scanReliability.outputResolution = Math.max(512, toInteger(next.scanReliability.outputResolution, 4096));
  next.scanReliability.format = 'SVG';
  next.scanReliability.marginPixels = Math.max(32, toInteger(next.scanReliability.marginPixels, 32));
  next.scanReliability.dpi = Math.max(300, toInteger(next.scanReliability.dpi, 300));

  next.visualSettings.foregroundColor = normalizeHexColor(next.visualSettings.foregroundColor, ENTERPRISE_DEFAULTS.visualSettings.foregroundColor);
  next.visualSettings.backgroundColor = normalizeHexColor(next.visualSettings.backgroundColor, ENTERPRISE_DEFAULTS.visualSettings.backgroundColor);
  next.visualSettings.gradientStart = normalizeHexColor(next.visualSettings.gradientStart, ENTERPRISE_DEFAULTS.visualSettings.gradientStart);
  next.visualSettings.gradientEnd = normalizeHexColor(next.visualSettings.gradientEnd, ENTERPRISE_DEFAULTS.visualSettings.gradientEnd);
  next.visualSettings.enableGradient = Boolean(next.visualSettings.enableGradient);
  next.visualSettings.logo.enabled = Boolean(next.visualSettings.logo.enabled);
  next.visualSettings.logo.url = String(next.visualSettings.logo.url || '').trim();
  next.visualSettings.logo.sizePercent = clamp(toInteger(next.visualSettings.logo.sizePercent, 18), 8, 30);
  next.visualSettings.shape.modules = next.visualSettings.shape.modules === 'rounded' ? 'rounded' : 'square';
  next.visualSettings.shape.corners = next.visualSettings.shape.corners === 'rounded' ? 'rounded' : 'square';
  next.visualSettings.border.enabled = Boolean(next.visualSettings.border.enabled);
  next.visualSettings.border.color = normalizeHexColor(next.visualSettings.border.color, ENTERPRISE_DEFAULTS.visualSettings.border.color);
  next.visualSettings.border.size = Math.max(8, toInteger(next.visualSettings.border.size, 32));

  const fgLum = relativeLuminance(next.visualSettings.foregroundColor);
  const bgLum = relativeLuminance(next.visualSettings.backgroundColor);
  const contrast = contrastRatio(next.visualSettings.foregroundColor, next.visualSettings.backgroundColor);
  if (fgLum >= bgLum || contrast < MIN_ENTERPRISE_CONTRAST_RATIO) {
    next.visualSettings.foregroundColor = ENTERPRISE_DEFAULTS.visualSettings.foregroundColor;
    next.visualSettings.backgroundColor = ENTERPRISE_DEFAULTS.visualSettings.backgroundColor;
    next.visualSettings.enableGradient = false;
    warnings.push('Low-contrast styling blocked; reverted to black on white.');
  }
  if (next.visualSettings.enableGradient) {
    const startLum = relativeLuminance(next.visualSettings.gradientStart);
    const endLum = relativeLuminance(next.visualSettings.gradientEnd);
    const startContrast = contrastRatio(next.visualSettings.gradientStart, next.visualSettings.backgroundColor);
    const endContrast = contrastRatio(next.visualSettings.gradientEnd, next.visualSettings.backgroundColor);
    const gradientSafe =
      startLum < bgLum &&
      endLum < bgLum &&
      startContrast >= MIN_ENTERPRISE_CONTRAST_RATIO &&
      endContrast >= MIN_ENTERPRISE_CONTRAST_RATIO;
    if (!gradientSafe) {
      next.visualSettings.enableGradient = false;
      next.visualSettings.gradientStart = ENTERPRISE_DEFAULTS.visualSettings.gradientStart;
      next.visualSettings.gradientEnd = ENTERPRISE_DEFAULTS.visualSettings.gradientEnd;
      warnings.push('Unsafe gradient contrast blocked; gradient disabled.');
    }
  }
  if (next.visualSettings.logo.enabled && next.scanReliability.errorCorrectionLevel !== 'H') {
    next.scanReliability.errorCorrectionLevel = 'H';
    warnings.push('Logo requires error correction H. Auto-upgraded.');
  }

  next.behaviorSettings.trackScans = Boolean(next.behaviorSettings.trackScans);
  next.behaviorSettings.allowRedirectUpdates = Boolean(next.behaviorSettings.allowRedirectUpdates);
  next.behaviorSettings.enableAnalytics = Boolean(next.behaviorSettings.enableAnalytics);
  next.behaviorSettings.allowExport = Boolean(next.behaviorSettings.allowExport);
  next.behaviorSettings.allowDisable = Boolean(next.behaviorSettings.allowDisable);
  next.behaviorSettings.requireHttps = Boolean(next.behaviorSettings.requireHttps);
  next.analyticsSettings.trackUniqueScans = Boolean(next.analyticsSettings.trackUniqueScans);
  next.analyticsSettings.trackDevice = Boolean(next.analyticsSettings.trackDevice);
  next.analyticsSettings.trackLocation = Boolean(next.analyticsSettings.trackLocation);
  next.analyticsSettings.trackTimestamp = Boolean(next.analyticsSettings.trackTimestamp);
  next.analyticsSettings.trackReferrer = Boolean(next.analyticsSettings.trackReferrer);

  const formats = Array.isArray(next.exportSettings.formats) ? next.exportSettings.formats.map((value) => String(value).toUpperCase()) : [];
  if (!formats.includes('SVG')) formats.unshift('SVG');
  if (!formats.includes('PNG')) formats.push('PNG');
  next.exportSettings.formats = Array.from(new Set(formats));
  next.exportSettings.svgPreferred = true;
  const pngSizes = Array.isArray(next.exportSettings.pngSizes) ? next.exportSettings.pngSizes : ENTERPRISE_DEFAULTS.exportSettings.pngSizes;
  next.exportSettings.pngSizes = Array.from(new Set(pngSizes.map((value) => Math.max(512, toInteger(value, 512))))).sort((a, b) => a - b);

  next.securitySettings.dynamicOnly = true;
  next.securitySettings.allowEditAfterCreate = Boolean(next.securitySettings.allowEditAfterCreate);
  next.securitySettings.requireSecureDestination = true;
  next.securitySettings.preventClientSideSecrets = true;

  const secureRequired = next.behaviorSettings.requireHttps || next.securitySettings.requireSecureDestination;
  if (secureRequired && !isHttpsUrl(next.qrSettings.destination)) {
    next.qrSettings.destination = ENTERPRISE_DEFAULTS.qrSettings.destination;
    warnings.push('Destination must use HTTPS. Reverted to safe value.');
  }
  if (next.qrSettings.redirect.fallbackUrl && secureRequired && !isHttpsUrl(next.qrSettings.redirect.fallbackUrl)) {
    next.qrSettings.redirect.fallbackUrl = '';
    warnings.push('Fallback URL must use HTTPS. Cleared.');
  }
  if (next.securitySettings.preventClientSideSecrets && hasSecretLikeData(next.qrSettings.destination)) {
    next.qrSettings.destination = ENTERPRISE_DEFAULTS.qrSettings.destination;
    warnings.push('Destination query appears to include secrets. Reverted.');
  }
  if (next.securitySettings.preventClientSideSecrets && next.qrSettings.redirect.fallbackUrl && hasSecretLikeData(next.qrSettings.redirect.fallbackUrl)) {
    next.qrSettings.redirect.fallbackUrl = '';
    warnings.push('Fallback query appears to include secrets. Cleared.');
  }

  if (log && warnings.length) warnings.forEach((warning) => console.warn(`[Enterprise QR] ${warning}`));
  return next;
}

function createEnterpriseConfig(overrides = {}) {
  return enforceEnterpriseStandards(deepMerge(ENTERPRISE_DEFAULTS, overrides), { log: false });
}

const enterpriseConfig = createEnterpriseConfig();
const renderParams = deepClone(RENDER_DEFAULTS);

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(18, window.innerWidth / window.innerHeight, 10, 1000);
camera.position.set(100, -30, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

new RGBELoader().setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/').load('brown_photostudio_02_2k.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  scene.environment = texture;
});

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(15, 20, 15);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0005;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

const qrGroup = new THREE.Group();
scene.add(qrGroup);

let texFine = null;
const veinsMaterials = [];

const materialMetal = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.05 });
const materialSide = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.3, roughness: 0.8 });
const materialBase = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.1, roughness: 0.8 });

const materialOverlayFine = new THREE.MeshBasicMaterial({
  color: 0x000000,
  alphaMap: null,
  transparent: true,
  opacity: renderParams.fineOpacity,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.NormalBlending,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1
});

const borderFrameMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

let gui = null;
let analyticsRuntimeState = null;
let exportRuntimeState = null;

function getQuietZoneModules() {
  return enterpriseConfig.scanReliability.quietZoneModules;
}

function getDynamicPayloadUrl() {
  return `${QR_REDIRECT_DOMAIN}/${enterpriseConfig.qrSettings.id}`;
}

function refreshGui() {
  if (!gui?.controllersRecursive) return;
  gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
}

function syncRuntimePanels() {
  if (analyticsRuntimeState) analyticsRuntimeState.queueSize = runtime.analyticsQueue.length;
  if (exportRuntimeState) exportRuntimeState.lastExport = runtime.lastExport || 'None';
}

function syncDynamicRoute() {
  runtime.dynamicRoutingTable.set(enterpriseConfig.qrSettings.id, {
    destination: enterpriseConfig.qrSettings.destination,
    redirect: deepClone(enterpriseConfig.qrSettings.redirect),
    enabled: enterpriseConfig.qrSettings.enabled,
    updatedAt: new Date().toISOString()
  });
}

async function syncRouteConfigToServer({ quiet = false } = {}) {
  const id = String(enterpriseConfig.qrSettings.id || '').trim();
  if (!id) return false;

  const payload = {
    name: enterpriseConfig.qrSettings.name,
    destination: enterpriseConfig.qrSettings.destination,
    enabled: enterpriseConfig.qrSettings.enabled,
    redirectType: enterpriseConfig.qrSettings.redirect.type,
    fallbackUrl: enterpriseConfig.qrSettings.redirect.fallbackUrl,
    openInNewTab: enterpriseConfig.qrSettings.redirect.openInNewTab
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (QR_CONFIG_WRITE_TOKEN) headers['x-qr-admin-token'] = QR_CONFIG_WRITE_TOKEN;

    const response = await fetch(`${QR_CONFIG_API_BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sync failed (${response.status}): ${body}`);
    }
    return true;
  } catch (error) {
    if (!quiet) console.warn('[Enterprise QR] Route sync failed.', error);
    return false;
  }
}

function queueRouteSync(options) {
  void syncRouteConfigToServer(options);
}

function clearQRGroup() {
  while (qrGroup.children.length > 0) {
    const object = qrGroup.children[0];
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
    qrGroup.remove(object);
  }
}

function createMaskedFineNoiseTexture(density = 1.0, qrData = null) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  if (!qrData) return new THREE.CanvasTexture(canvas);

  const rawCount = qrData.getModuleCount();
  const borderOffset = getQuietZoneModules();
  const totalCount = rawCount + (borderOffset * 2);
  const modulePx = size / totalCount;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() > (1.0 - (density * 0.5))) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.random() * 150;
    } else {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'black';
  for (let r = 0; r < rawCount; r++) {
    for (let c = 0; c < rawCount; c++) {
      if (!qrData.isDark(r, c)) continue;
      const drawC = c + borderOffset;
      const drawR = r + borderOffset;
      ctx.fillRect(drawC * modulePx, drawR * modulePx, modulePx, modulePx);
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createVeinsTexture(scale = 1.0, qrData = null) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 4;
  ctx.strokeStyle = '#FFFFFF';

  function drawCrack(x, y, angle, width, life) {
    if (life <= 0 || width < 0.2) return;
    const segmentLength = 5 + (Math.random() * 15);
    const x2 = x + (Math.cos(angle) * segmentLength);
    const y2 = y + (Math.sin(angle) * segmentLength);
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const newAngle = angle + ((Math.random() - 0.5) * 1.5);
    const newWidth = width * 0.92;
    const newLife = life - 1;
    drawCrack(x2, y2, newAngle, newWidth, newLife);
    if (Math.random() < 0.08) {
      const splitDir = Math.random() < 0.5 ? -1 : 1;
      drawCrack(x2, y2, angle + (splitDir * (0.4 + (Math.random() * 0.5))), newWidth * 0.7, newLife * 0.7);
    }
  }

  for (let i = 0; i < 15 * scale; i++) {
    drawCrack(Math.random() * size, Math.random() * size, Math.random() * Math.PI * 2, (Math.random() * 3 + 1) * scale, 50);
  }

  if (qrData) {
    const rawCount = qrData.getModuleCount();
    const borderOffset = getQuietZoneModules();
    const totalCount = rawCount + (borderOffset * 2);
    const modulePx = size / totalCount;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'black';
    for (let r = 0; r < rawCount; r++) {
      for (let c = 0; c < rawCount; c++) {
        if (!qrData.isDark(r, c)) continue;
        const drawC = c + borderOffset;
        const drawR = r + borderOffset;
        ctx.fillRect(drawC * modulePx, drawR * modulePx, modulePx, modulePx);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function applyVisualSettingsToMaterials() {
  const fg = enterpriseConfig.visualSettings.foregroundColor;
  const bg = enterpriseConfig.visualSettings.backgroundColor;
  const sideColor = new THREE.Color(fg).lerp(new THREE.Color('#000000'), 0.7);
  materialMetal.color.set(bg);
  materialSide.color.copy(sideColor);
  materialBase.color.set(fg);
  materialOverlayFine.color.set(fg);
  borderFrameMaterial.color.set(enterpriseConfig.visualSettings.border.color);
  veinsMaterials.forEach((material) => material.color.set(fg));
}

function updateFineTexture() {
  if (texFine) texFine.dispose();
  texFine = createMaskedFineNoiseTexture(renderParams.fineDensity, runtime.currentQR);
  materialOverlayFine.alphaMap = texFine;
  materialOverlayFine.needsUpdate = true;
}

function updateAllVeinsTextures() {
  veinsMaterials.forEach((material) => {
    if (material.alphaMap) material.alphaMap.dispose();
    material.alphaMap = createVeinsTexture(renderParams.cutScale, runtime.currentQR);
    material.needsUpdate = true;
  });
}

function initVeinsMaterials() {
  veinsMaterials.length = 0;
  for (let i = 0; i < 6; i++) {
    veinsMaterials.push(new THREE.MeshBasicMaterial({
      color: 0x000000,
      alphaMap: createVeinsTexture(renderParams.cutScale),
      transparent: true,
      opacity: 1.0,
      alphaTest: renderParams.cutThreshold,
      side: THREE.DoubleSide,
      depthWrite: true
    }));
  }
}

initVeinsMaterials();
applyVisualSettingsToMaterials();

function updateEnterpriseConfig(patch, { regenerate = true, log = true } = {}) {
  if (!enterpriseConfig.securitySettings.allowEditAfterCreate) {
    console.warn('[Enterprise QR] Edits are disabled by allowEditAfterCreate=false.');
    return false;
  }
  const merged = deepMerge(enterpriseConfig, patch);
  const validated = enforceEnterpriseStandards(merged, { log });
  deepAssign(enterpriseConfig, validated);
  applyVisualSettingsToMaterials();
  syncDynamicRoute();
  syncRuntimePanels();
  refreshGui();
  if (regenerate) generateQR();
  return true;
}

function createQRCode(overrides = {}) {
  const created = createEnterpriseConfig(overrides);
  if (!created.qrSettings.id) created.qrSettings.id = createId();
  deepAssign(enterpriseConfig, created);
  applyVisualSettingsToMaterials();
  syncDynamicRoute();
  queueRouteSync();
  generateQR();
  syncRuntimePanels();
  refreshGui();
  return deepClone(enterpriseConfig);
}

function updateQRCode(patch = {}) {
  const updated = updateEnterpriseConfig(patch, { regenerate: true, log: true });
  if (updated && patch?.qrSettings) queueRouteSync();
  return updated;
}

function setQRCodeEnabled(enabled) {
  if (!enabled && !enterpriseConfig.behaviorSettings.allowDisable) {
    console.warn('[Enterprise QR] Disabling QR is blocked by allowDisable=false.');
    enterpriseConfig.qrSettings.enabled = true;
    refreshGui();
    return false;
  }
  enterpriseConfig.qrSettings.enabled = Boolean(enabled);
  if (!enterpriseConfig.qrSettings.enabled) {
    qrGroup.visible = false;
  } else if (qrGroup.children.length === 0) {
    generateQR();
  } else {
    qrGroup.visible = true;
  }
  syncDynamicRoute();
  queueRouteSync();
  refreshGui();
  return true;
}

function enableQRCode() {
  return setQRCodeEnabled(true);
}

function disableQRCode() {
  return setQRCodeEnabled(false);
}

function updateDestinationDynamically(destination) {
  if (!enterpriseConfig.behaviorSettings.allowRedirectUpdates) {
    console.warn('[Enterprise QR] Redirect updates are disabled by policy.');
    refreshGui();
    return false;
  }
  const updated = updateEnterpriseConfig({ qrSettings: { destination: String(destination || '').trim() } }, { regenerate: false });
  if (updated) queueRouteSync();
  return updated;
}

function applyVisualStylesSafely(patch) {
  return updateEnterpriseConfig({ visualSettings: patch }, { regenerate: true, log: true });
}

function addAnalyticsEvent(partial = {}) {
  if (!enterpriseConfig.behaviorSettings.trackScans || !enterpriseConfig.behaviorSettings.enableAnalytics) {
    return null;
  }
  const event = {
    qrId: enterpriseConfig.qrSettings.id,
    qrName: enterpriseConfig.qrSettings.name,
    destination: enterpriseConfig.qrSettings.destination,
    redirectType: enterpriseConfig.qrSettings.redirect.type
  };
  if (enterpriseConfig.analyticsSettings.trackUniqueScans) event.scanId = createId();
  if (enterpriseConfig.analyticsSettings.trackTimestamp) event.timestamp = new Date().toISOString();
  if (enterpriseConfig.analyticsSettings.trackDevice) event.device = navigator.userAgent;
  if (enterpriseConfig.analyticsSettings.trackLocation) event.location = partial.location || 'pending-ip-geolocation';
  if (enterpriseConfig.analyticsSettings.trackReferrer) event.referrer = partial.referrer || document.referrer || 'direct';
  Object.assign(event, partial);
  runtime.analyticsQueue.push(event);
  syncRuntimePanels();
  return event;
}

function generateQR() {
  clearQRGroup();

  if (!enterpriseConfig.qrSettings.enabled) {
    qrGroup.visible = false;
    return;
  }
  qrGroup.visible = true;

  const qr = qrcodeFactory(0, enterpriseConfig.scanReliability.errorCorrectionLevel);
  runtime.currentQR = qr;
  try {
    qr.addData(getDynamicPayloadUrl());
    qr.make();
  } catch (error) {
    console.warn('[Enterprise QR] Could not generate QR:', error);
    return;
  }

  updateFineTexture();
  updateAllVeinsTextures();
  applyVisualSettingsToMaterials();

  const rawCount = qr.getModuleCount();
  const borderOffset = getQuietZoneModules();
  const totalCount = rawCount + (borderOffset * 2);
  const moduleSize = renderParams.baseSize / totalCount;

  const baseGeometry = new THREE.BoxGeometry(renderParams.baseSize, renderParams.baseSize, renderParams.baseSize);
  const baseCube = new THREE.Mesh(baseGeometry, materialBase);
  baseCube.castShadow = true;
  baseCube.receiveShadow = true;
  qrGroup.add(baseCube);

  const baseDustGeo = new THREE.BoxGeometry(renderParams.baseSize + 0.01, renderParams.baseSize + 0.01, renderParams.baseSize + 0.01);
  qrGroup.add(new THREE.Mesh(baseDustGeo, materialOverlayFine));

  const tileSize = moduleSize * 1.02;
  const blockGeometry = new THREE.BoxGeometry(tileSize, tileSize, renderParams.layerDepth);

  let metalTilesCount = 0;
  for (let r = 0; r < totalCount; r++) {
    for (let c = 0; c < totalCount; c++) {
      if (r < borderOffset || r >= totalCount - borderOffset || c < borderOffset || c >= totalCount - borderOffset) {
        metalTilesCount++;
      } else if (!qr.isDark(r - borderOffset, c - borderOffset)) {
        metalTilesCount++;
      }
    }
  }

  const materialsList = [materialSide, materialSide, materialSide, materialSide, materialMetal, materialSide];
  const meshInstanced = new THREE.InstancedMesh(blockGeometry, materialsList, metalTilesCount * 6);
  const dummy = new THREE.Object3D();
  let idx = 0;
  const surfaceDist = (renderParams.baseSize / 2) + (renderParams.layerDepth / 2);

  for (let face = 0; face < 6; face++) {
    for (let r = 0; r < totalCount; r++) {
      for (let c = 0; c < totalCount; c++) {
        const inQuiet = r < borderOffset || r >= totalCount - borderOffset || c < borderOffset || c >= totalCount - borderOffset;
        const isMetal = inQuiet || !qr.isDark(r - borderOffset, c - borderOffset);
        if (!isMetal) continue;

        const u = (c - totalCount / 2 + 0.5) * moduleSize;
        const v = -(r - totalCount / 2 + 0.5) * moduleSize;
        dummy.rotation.set(0, 0, 0);
        switch (face) {
          case 0:
            dummy.position.set(u, v, surfaceDist);
            break;
          case 1:
            dummy.position.set(-u, v, -surfaceDist);
            dummy.rotation.y = Math.PI;
            break;
          case 2:
            dummy.position.set(u, surfaceDist, -v);
            dummy.rotation.x = -Math.PI / 2;
            break;
          case 3:
            dummy.position.set(u, -surfaceDist, v);
            dummy.rotation.x = Math.PI / 2;
            break;
          case 4:
            dummy.position.set(surfaceDist, v, -u);
            dummy.rotation.y = Math.PI / 2;
            break;
          case 5:
            dummy.position.set(-surfaceDist, v, u);
            dummy.rotation.y = -Math.PI / 2;
            break;
          default:
            break;
        }
        dummy.updateMatrix();
        meshInstanced.setMatrixAt(idx++, dummy.matrix);
      }
    }
  }
  meshInstanced.castShadow = true;
  meshInstanced.receiveShadow = true;
  qrGroup.add(meshInstanced);

  const overlayPlaneGeo = new THREE.PlaneGeometry(renderParams.baseSize, renderParams.baseSize);
  const dustGroup = new THREE.Group();
  const dustDist = (renderParams.baseSize / 2) + renderParams.layerDepth + 0.005;
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(overlayPlaneGeo, materialOverlayFine);
    switch (i) {
      case 0: mesh.position.z = dustDist; break;
      case 1: mesh.position.z = -dustDist; mesh.rotation.y = Math.PI; break;
      case 2: mesh.position.y = dustDist; mesh.rotation.x = -Math.PI / 2; break;
      case 3: mesh.position.y = -dustDist; mesh.rotation.x = Math.PI / 2; break;
      case 4: mesh.position.x = dustDist; mesh.rotation.y = Math.PI / 2; break;
      case 5: mesh.position.x = -dustDist; mesh.rotation.y = -Math.PI / 2; break;
      default: break;
    }
    dustGroup.add(mesh);
  }
  qrGroup.add(dustGroup);

  const cutsGroup = new THREE.Group();
  const cutDist = (renderParams.baseSize / 2) + renderParams.layerDepth + 0.01;
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(overlayPlaneGeo, veinsMaterials[i]);
    switch (i) {
      case 0: mesh.position.z = cutDist; break;
      case 1: mesh.position.z = -cutDist; mesh.rotation.y = Math.PI; break;
      case 2: mesh.position.y = cutDist; mesh.rotation.x = -Math.PI / 2; break;
      case 3: mesh.position.y = -cutDist; mesh.rotation.x = Math.PI / 2; break;
      case 4: mesh.position.x = cutDist; mesh.rotation.y = Math.PI / 2; break;
      case 5: mesh.position.x = -cutDist; mesh.rotation.y = -Math.PI / 2; break;
      default: break;
    }
    cutsGroup.add(mesh);
  }
  qrGroup.add(cutsGroup);

  if (enterpriseConfig.visualSettings.border.enabled) {
    const borderScale = enterpriseConfig.visualSettings.border.size / 512;
    const frameSize = renderParams.baseSize + (renderParams.layerDepth * 2) + borderScale;
    const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(frameSize, frameSize, frameSize));
    qrGroup.add(new THREE.LineSegments(frameGeometry, borderFrameMaterial));
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function isFinderCell(row, col, count) {
  const finder = 7;
  return (row < finder && col < finder) || (row < finder && col >= count - finder) || (row >= count - finder && col < finder);
}

function getExportGeometry(size) {
  const rawCount = runtime.currentQR.getModuleCount();
  const quietZone = enterpriseConfig.scanReliability.quietZoneModules;
  const marginPixels = enterpriseConfig.scanReliability.marginPixels;
  const totalModules = rawCount + (quietZone * 2);
  return {
    rawCount,
    quietZone,
    marginPixels,
    moduleSize: (size - (marginPixels * 2)) / totalModules,
    origin: marginPixels,
    size
  };
}

async function drawLogoOnCanvas(ctx, size) {
  if (!enterpriseConfig.visualSettings.logo.enabled || !enterpriseConfig.visualSettings.logo.url) return;
  const logoSize = size * (enterpriseConfig.visualSettings.logo.sizePercent / 100);
  const x = (size - logoSize) / 2;
  const y = (size - logoSize) / 2;
  const padding = Math.max(8, logoSize * 0.15);

  ctx.fillStyle = enterpriseConfig.visualSettings.backgroundColor;
  roundedRect(ctx, x - padding, y - padding, logoSize + (padding * 2), logoSize + (padding * 2), padding * 0.4);
  ctx.fill();

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = enterpriseConfig.visualSettings.logo.url;
  }).catch(() => null);
  if (image) ctx.drawImage(image, x, y, logoSize, logoSize);
}

async function renderStyledCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!runtime.currentQR) return canvas;

  const geometry = getExportGeometry(size);
  ctx.fillStyle = enterpriseConfig.visualSettings.backgroundColor;
  ctx.fillRect(0, 0, size, size);

  if (enterpriseConfig.visualSettings.border.enabled) {
    const strokeWidth = Math.min(enterpriseConfig.visualSettings.border.size, geometry.marginPixels * 1.5);
    ctx.strokeStyle = enterpriseConfig.visualSettings.border.color;
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(
      geometry.origin + (strokeWidth / 2),
      geometry.origin + (strokeWidth / 2),
      size - (geometry.origin * 2) - strokeWidth,
      size - (geometry.origin * 2) - strokeWidth
    );
  }

  if (enterpriseConfig.visualSettings.enableGradient) {
    const gradient = ctx.createLinearGradient(0, geometry.origin, 0, geometry.size - geometry.origin);
    gradient.addColorStop(0, enterpriseConfig.visualSettings.gradientStart);
    gradient.addColorStop(1, enterpriseConfig.visualSettings.gradientEnd);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = enterpriseConfig.visualSettings.foregroundColor;
  }

  const roundedModules = enterpriseConfig.visualSettings.shape.modules === 'rounded';
  const roundedCorners = enterpriseConfig.visualSettings.shape.corners === 'rounded';
  for (let row = 0; row < geometry.rawCount; row++) {
    for (let col = 0; col < geometry.rawCount; col++) {
      if (!runtime.currentQR.isDark(row, col)) continue;
      const x = geometry.origin + ((geometry.quietZone + col) * geometry.moduleSize);
      const y = geometry.origin + ((geometry.quietZone + row) * geometry.moduleSize);
      const useRound = isFinderCell(row, col, geometry.rawCount) ? roundedCorners : roundedModules;
      if (useRound) {
        roundedRect(ctx, x, y, geometry.moduleSize, geometry.moduleSize, geometry.moduleSize * 0.28);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, geometry.moduleSize, geometry.moduleSize);
      }
    }
  }

  await drawLogoOnCanvas(ctx, size);
  return canvas;
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function createStyledSvg(size) {
  const geometry = getExportGeometry(size);
  const lines = [];
  const roundedModules = enterpriseConfig.visualSettings.shape.modules === 'rounded';
  const roundedCorners = enterpriseConfig.visualSettings.shape.corners === 'rounded';
  const moduleRadius = geometry.moduleSize * 0.28;

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`);
  lines.push(`<metadata>Enterprise Dynamic QR • ${escapeXml(enterpriseConfig.qrSettings.id)} • ${enterpriseConfig.scanReliability.dpi} DPI target</metadata>`);
  lines.push(`<rect x="0" y="0" width="${size}" height="${size}" fill="${enterpriseConfig.visualSettings.backgroundColor}" />`);

  if (enterpriseConfig.visualSettings.enableGradient) {
    lines.push('<defs>');
    lines.push('<linearGradient id="enterprise-qr-gradient" x1="0%" y1="0%" x2="0%" y2="100%">');
    lines.push(`<stop offset="0%" stop-color="${enterpriseConfig.visualSettings.gradientStart}" />`);
    lines.push(`<stop offset="100%" stop-color="${enterpriseConfig.visualSettings.gradientEnd}" />`);
    lines.push('</linearGradient>');
    lines.push('</defs>');
  }

  if (enterpriseConfig.visualSettings.border.enabled) {
    const strokeWidth = Math.min(enterpriseConfig.visualSettings.border.size, geometry.marginPixels * 1.5);
    lines.push(`<rect x="${geometry.origin + (strokeWidth / 2)}" y="${geometry.origin + (strokeWidth / 2)}" width="${size - (geometry.origin * 2) - strokeWidth}" height="${size - (geometry.origin * 2) - strokeWidth}" fill="none" stroke="${enterpriseConfig.visualSettings.border.color}" stroke-width="${strokeWidth}" />`);
  }

  const fill = enterpriseConfig.visualSettings.enableGradient ? 'url(#enterprise-qr-gradient)' : enterpriseConfig.visualSettings.foregroundColor;
  for (let row = 0; row < geometry.rawCount; row++) {
    for (let col = 0; col < geometry.rawCount; col++) {
      if (!runtime.currentQR.isDark(row, col)) continue;
      const x = geometry.origin + ((geometry.quietZone + col) * geometry.moduleSize);
      const y = geometry.origin + ((geometry.quietZone + row) * geometry.moduleSize);
      const useRound = isFinderCell(row, col, geometry.rawCount) ? roundedCorners : roundedModules;
      if (useRound) {
        lines.push(`<rect x="${x}" y="${y}" width="${geometry.moduleSize}" height="${geometry.moduleSize}" rx="${moduleRadius}" ry="${moduleRadius}" fill="${fill}" />`);
      } else {
        lines.push(`<rect x="${x}" y="${y}" width="${geometry.moduleSize}" height="${geometry.moduleSize}" fill="${fill}" />`);
      }
    }
  }

  if (enterpriseConfig.visualSettings.logo.enabled && enterpriseConfig.visualSettings.logo.url) {
    const logoSize = size * (enterpriseConfig.visualSettings.logo.sizePercent / 100);
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    const padding = Math.max(8, logoSize * 0.15);
    lines.push(`<rect x="${x - padding}" y="${y - padding}" width="${logoSize + (padding * 2)}" height="${logoSize + (padding * 2)}" fill="${enterpriseConfig.visualSettings.backgroundColor}" rx="${padding * 0.4}" ry="${padding * 0.4}" />`);
    lines.push(`<image href="${escapeXml(enterpriseConfig.visualSettings.logo.url)}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />`);
  }

  lines.push('</svg>');
  return lines.join('\n');
}

function updateExportStatus(status, isError = false) {
  runtime.lastExport = isError ? `Failed: ${status}` : status;
  syncRuntimePanels();
}

function downloadBlob(filename, blob) {
  if (!(blob instanceof Blob)) {
    console.warn('[Enterprise QR] Download aborted: invalid blob payload.');
    return false;
  }

  if (!URL?.createObjectURL) {
    console.warn('[Enterprise QR] Download aborted: object URLs are unavailable.');
    return false;
  }

  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch (error) {
    console.error('[Enterprise QR] Download failed.', error);
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return false;
  }
}

function dataUrlToBlob(dataUrl) {
  const [header, body = ''] = String(dataUrl).split(',', 2);
  const mimeMatch = /^data:([^;]+)(;base64)?$/i.exec(header);
  if (!mimeMatch) throw new Error('Invalid data URL.');
  const mime = mimeMatch[1] || 'application/octet-stream';
  const isBase64 = Boolean(mimeMatch[2]);
  const decoded = isBase64 ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function canvasToBlobFallback(canvas, type) {
  if (typeof canvas?.toDataURL !== 'function') return null;
  const dataUrl = canvas.toDataURL(type);
  if (!dataUrl || dataUrl === 'data:,') return null;
  return dataUrlToBlob(dataUrl);
}

async function getPngBlob(canvas) {
  const mimeType = 'image/png';
  if (!canvas) throw new Error('Canvas is unavailable for PNG export.');

  if (typeof canvas.toBlob === 'function') {
    try {
      const blob = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), mimeType);
      });
      if (blob instanceof Blob) return blob;
      console.warn('[Enterprise QR] Canvas.toBlob returned null. Falling back to data URL conversion.');
    } catch (error) {
      console.warn('[Enterprise QR] Canvas.toBlob failed. Falling back to data URL conversion.', error);
    }
  }

  const fallbackBlob = canvasToBlobFallback(canvas, mimeType);
  if (fallbackBlob instanceof Blob) return fallbackBlob;
  throw new Error('Unable to create PNG blob from canvas.');
}

function pickAllowedPngSize(size) {
  const requested = toInteger(size, enterpriseConfig.scanReliability.outputResolution);
  const configured = Array.isArray(enterpriseConfig.exportSettings.pngSizes) ? enterpriseConfig.exportSettings.pngSizes : [];
  const allowed = configured
    .map((value) => Math.max(1, toInteger(value, 0)))
    .filter((value) => Number.isFinite(value));

  if (!allowed.length) return Math.max(512, requested || 512);
  if (allowed.includes(requested)) return requested;
  return allowed.reduce((closest, candidate) => (
    Math.abs(candidate - requested) < Math.abs(closest - requested) ? candidate : closest
  ), allowed[0]);
}

async function exportQRCode(format = 'SVG', requestedPngSize = enterpriseConfig.scanReliability.outputResolution) {
  if (!enterpriseConfig.behaviorSettings.allowExport) {
    const message = 'Exports disabled by policy.';
    console.warn(`[Enterprise QR] ${message}`);
    updateExportStatus(message, true);
    return false;
  }

  try {
    if (!runtime.currentQR) generateQR();
  } catch (error) {
    console.error('[Enterprise QR] Failed to generate QR before export.', error);
  }
  if (!runtime.currentQR) {
    updateExportStatus('QR data is unavailable.', true);
    return false;
  }

  const normalized = String(format || 'SVG').toUpperCase();

  if (normalized === 'SVG') {
    try {
      const size = enterpriseConfig.scanReliability.outputResolution;
      const svg = createStyledSvg(size);
      const downloaded = downloadBlob(
        `enterprise-qr-${enterpriseConfig.qrSettings.id}.svg`,
        new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      );
      if (!downloaded) {
        updateExportStatus(`SVG (${size}px)`, true);
        return false;
      }
      updateExportStatus(`SVG (${size}px)`);
      return true;
    } catch (error) {
      console.error('[Enterprise QR] SVG export failed.', error);
      updateExportStatus('SVG export failed.', true);
      return false;
    }
  }

  if (normalized === 'PNG') {
    const size = pickAllowedPngSize(requestedPngSize);
    try {
      const canvas = await renderStyledCanvas(size);
      const blob = await getPngBlob(canvas);
      const downloaded = downloadBlob(`enterprise-qr-${enterpriseConfig.qrSettings.id}-${size}px.png`, blob);
      if (!downloaded) {
        updateExportStatus(`PNG (${size}px)`, true);
        return false;
      }
      updateExportStatus(`PNG (${size}px)`);
      return true;
    } catch (error) {
      console.error('[Enterprise QR] PNG export failed.', error);
      updateExportStatus(`PNG (${size}px)`, true);
      return false;
    }
  }

  console.warn('[Enterprise QR] Unsupported export format.', format);
  updateExportStatus(`Unsupported format (${normalized || 'UNKNOWN'})`, true);
  return false;
}

function exportAnalyticsQueue() {
  const payload = {
    generatedAt: new Date().toISOString(),
    qrId: enterpriseConfig.qrSettings.id,
    events: runtime.analyticsQueue
  };
  downloadBlob(
    `enterprise-qr-analytics-${enterpriseConfig.qrSettings.id}.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  );
}

function buildGui() {
  gui = new GUI({ title: 'Enterprise QR Settings', width: 390 });

  const actions = {
    createQR: () => {
      createQRCode({
        qrSettings: {
          id: createId(),
          name: `Enterprise QR ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`
        }
      });
    },
    updateQR: () => updateQRCode({}),
    updateDestination: () => updateDestinationDynamically(enterpriseConfig.qrSettings.destination),
    enableQR: () => enableQRCode(),
    disableQR: () => disableQRCode(),
    exportNow: () => exportQRCode(renderParams.exportFormat, renderParams.exportPngSize),
    simulateScan: () => addAnalyticsEvent({ simulated: true }),
    exportAnalytics: () => exportAnalyticsQueue(),
    clearAnalytics: () => {
      runtime.analyticsQueue.length = 0;
      syncRuntimePanels();
      refreshGui();
    }
  };

  analyticsRuntimeState = { queueSize: 0 };
  exportRuntimeState = { lastExport: 'None' };

  const fCore = gui.addFolder('Core QR Configuration');
  fCore.add(enterpriseConfig.qrSettings, 'id').name('ID').onFinishChange((value) => {
    updateQRCode({ qrSettings: { id: String(value || '').trim() || createId() } });
  });
  fCore.add(enterpriseConfig.qrSettings, 'name').name('Name').onFinishChange((value) => {
    updateQRCode({ qrSettings: { name: value } });
  });
  fCore.add(enterpriseConfig.qrSettings, 'type', ['dynamic']).name('Type').onChange(() => {
    enterpriseConfig.qrSettings.type = 'dynamic';
    refreshGui();
  });
  fCore.add(enterpriseConfig.qrSettings, 'destination').name('Destination').onFinishChange((value) => {
    updateDestinationDynamically(value);
  });
  fCore.add(enterpriseConfig.qrSettings, 'enabled').name('Enabled').onChange((value) => {
    setQRCodeEnabled(value);
  });

  const fRedirect = fCore.addFolder('Redirect');
  fRedirect.add(enterpriseConfig.qrSettings.redirect, 'type', ['single', 'smart', 'conditional']).name('Type').onChange((value) => {
    updateQRCode({ qrSettings: { redirect: { type: value } } });
  });
  fRedirect.add(enterpriseConfig.qrSettings.redirect, 'fallbackUrl').name('Fallback URL').onFinishChange((value) => {
    updateQRCode({ qrSettings: { redirect: { fallbackUrl: value } } });
  });
  fRedirect.add(enterpriseConfig.qrSettings.redirect, 'openInNewTab').name('Open In New Tab').onChange((value) => {
    updateQRCode({ qrSettings: { redirect: { openInNewTab: value } } });
  });
  fRedirect.add(actions, 'updateDestination').name('Apply Dynamic URL');

  const fReliability = gui.addFolder('Scan Reliability');
  fReliability.add(enterpriseConfig.scanReliability, 'errorCorrectionLevel', ['L', 'M', 'Q', 'H']).name('Error Correction').onChange((value) => {
    updateQRCode({ scanReliability: { errorCorrectionLevel: value } });
  });
  fReliability.add(enterpriseConfig.scanReliability, 'quietZoneModules', 4, 16, 1).name('Quiet Zone').onChange((value) => {
    updateQRCode({ scanReliability: { quietZoneModules: value } });
  });
  fReliability.add(enterpriseConfig.scanReliability, 'outputResolution', 512, 8192, 256).name('Output Resolution').onFinishChange((value) => {
    updateQRCode({ scanReliability: { outputResolution: value } });
  });
  fReliability.add(enterpriseConfig.scanReliability, 'format', ['SVG']).name('Format').onChange(() => {
    enterpriseConfig.scanReliability.format = 'SVG';
    refreshGui();
  });
  fReliability.add(enterpriseConfig.scanReliability, 'marginPixels', 32, 256, 2).name('Margin Pixels').onChange((value) => {
    updateQRCode({ scanReliability: { marginPixels: value } });
  });
  fReliability.add(enterpriseConfig.scanReliability, 'dpi', 300, 1200, 50).name('DPI').onChange((value) => {
    updateQRCode({ scanReliability: { dpi: value } });
  });

  const fVisual = gui.addFolder('Visual Settings');
  fVisual.addColor(enterpriseConfig.visualSettings, 'foregroundColor').name('Foreground').onFinishChange((value) => {
    applyVisualStylesSafely({ foregroundColor: value });
  });
  fVisual.addColor(enterpriseConfig.visualSettings, 'backgroundColor').name('Background').onFinishChange((value) => {
    applyVisualStylesSafely({ backgroundColor: value });
  });
  fVisual.add(enterpriseConfig.visualSettings, 'enableGradient').name('Gradient').onChange((value) => {
    applyVisualStylesSafely({ enableGradient: value });
  });
  fVisual.addColor(enterpriseConfig.visualSettings, 'gradientStart').name('Gradient Start').onFinishChange((value) => {
    applyVisualStylesSafely({ gradientStart: value });
  });
  fVisual.addColor(enterpriseConfig.visualSettings, 'gradientEnd').name('Gradient End').onFinishChange((value) => {
    applyVisualStylesSafely({ gradientEnd: value });
  });

  const fLogo = fVisual.addFolder('Logo');
  fLogo.add(enterpriseConfig.visualSettings.logo, 'enabled').name('Enabled').onChange((value) => {
    applyVisualStylesSafely({ logo: { enabled: value } });
  });
  fLogo.add(enterpriseConfig.visualSettings.logo, 'url').name('URL').onFinishChange((value) => {
    applyVisualStylesSafely({ logo: { url: value } });
  });
  fLogo.add(enterpriseConfig.visualSettings.logo, 'sizePercent', 8, 30, 1).name('Size %').onChange((value) => {
    applyVisualStylesSafely({ logo: { sizePercent: value } });
  });

  const fShape = fVisual.addFolder('Shape');
  fShape.add(enterpriseConfig.visualSettings.shape, 'modules', ['square', 'rounded']).name('Modules').onChange((value) => {
    applyVisualStylesSafely({ shape: { modules: value } });
  });
  fShape.add(enterpriseConfig.visualSettings.shape, 'corners', ['square', 'rounded']).name('Corners').onChange((value) => {
    applyVisualStylesSafely({ shape: { corners: value } });
  });

  const fBorder = fVisual.addFolder('Border');
  fBorder.add(enterpriseConfig.visualSettings.border, 'enabled').name('Enabled').onChange((value) => {
    applyVisualStylesSafely({ border: { enabled: value } });
  });
  fBorder.addColor(enterpriseConfig.visualSettings.border, 'color').name('Color').onFinishChange((value) => {
    applyVisualStylesSafely({ border: { color: value } });
  });
  fBorder.add(enterpriseConfig.visualSettings.border, 'size', 8, 96, 2).name('Size').onChange((value) => {
    applyVisualStylesSafely({ border: { size: value } });
  });

  const fBehavior = gui.addFolder('Behavior Settings');
  fBehavior.add(enterpriseConfig.behaviorSettings, 'trackScans').name('Track Scans').onChange((value) => {
    updateQRCode({ behaviorSettings: { trackScans: value } });
  });
  fBehavior.add(enterpriseConfig.behaviorSettings, 'allowRedirectUpdates').name('Allow Redirect Edit').onChange((value) => {
    updateQRCode({ behaviorSettings: { allowRedirectUpdates: value } });
  });
  fBehavior.add(enterpriseConfig.behaviorSettings, 'enableAnalytics').name('Enable Analytics').onChange((value) => {
    updateQRCode({ behaviorSettings: { enableAnalytics: value } });
  });
  fBehavior.add(enterpriseConfig.behaviorSettings, 'allowExport').name('Allow Export').onChange((value) => {
    updateQRCode({ behaviorSettings: { allowExport: value } });
  });
  fBehavior.add(enterpriseConfig.behaviorSettings, 'allowDisable').name('Allow Disable').onChange((value) => {
    updateQRCode({ behaviorSettings: { allowDisable: value } });
  });
  fBehavior.add(enterpriseConfig.behaviorSettings, 'requireHttps').name('Require HTTPS').onChange((value) => {
    updateQRCode({ behaviorSettings: { requireHttps: value } });
  });

  const fAnalytics = gui.addFolder('Analytics Settings');
  fAnalytics.add(enterpriseConfig.analyticsSettings, 'trackUniqueScans').name('Track Unique').onChange((value) => {
    updateQRCode({ analyticsSettings: { trackUniqueScans: value } });
  });
  fAnalytics.add(enterpriseConfig.analyticsSettings, 'trackDevice').name('Track Device').onChange((value) => {
    updateQRCode({ analyticsSettings: { trackDevice: value } });
  });
  fAnalytics.add(enterpriseConfig.analyticsSettings, 'trackLocation').name('Track Location').onChange((value) => {
    updateQRCode({ analyticsSettings: { trackLocation: value } });
  });
  fAnalytics.add(enterpriseConfig.analyticsSettings, 'trackTimestamp').name('Track Timestamp').onChange((value) => {
    updateQRCode({ analyticsSettings: { trackTimestamp: value } });
  });
  fAnalytics.add(enterpriseConfig.analyticsSettings, 'trackReferrer').name('Track Referrer').onChange((value) => {
    updateQRCode({ analyticsSettings: { trackReferrer: value } });
  });
  fAnalytics.add(analyticsRuntimeState, 'queueSize').name('Queued Events').listen();
  fAnalytics.add(actions, 'simulateScan').name('Simulate Scan');
  fAnalytics.add(actions, 'exportAnalytics').name('Export Analytics');
  fAnalytics.add(actions, 'clearAnalytics').name('Clear Analytics');

  const fExport = gui.addFolder('Export Settings');
  fExport.add(renderParams, 'exportFormat', ['SVG', 'PNG']).name('Format');
  fExport.add(renderParams, 'exportPngSize', enterpriseConfig.exportSettings.pngSizes).name('PNG Size');
  fExport.add(exportRuntimeState, 'lastExport').name('Last Export').listen();
  fExport.add(actions, 'exportNow').name('Export QR');

  const fSecurity = gui.addFolder('Security Settings');
  fSecurity.add(enterpriseConfig.securitySettings, 'dynamicOnly').name('Dynamic Only').onChange(() => {
    enterpriseConfig.securitySettings.dynamicOnly = true;
    refreshGui();
  });
  fSecurity.add(enterpriseConfig.securitySettings, 'allowEditAfterCreate').name('Allow Edit').onChange((value) => {
    updateQRCode({ securitySettings: { allowEditAfterCreate: value } });
  });
  fSecurity.add(enterpriseConfig.securitySettings, 'requireSecureDestination').name('Require Secure URL').onChange(() => {
    updateQRCode({ securitySettings: { requireSecureDestination: true } });
  });
  fSecurity.add(enterpriseConfig.securitySettings, 'preventClientSideSecrets').name('Block Secrets').onChange(() => {
    updateQRCode({ securitySettings: { preventClientSideSecrets: true } });
  });

  const fRender = gui.addFolder('3D Render Controls');
  fRender.add(renderParams, 'rotate').name('Auto Rotation').onChange((value) => { controls.autoRotate = value; });
  fRender.add(renderParams, 'layerDepth', 0.01, 1, 0.01).name('Layer Depth').onChange(() => generateQR());
  fRender.add(renderParams, 'fineOpacity', 0, 1, 0.01).name('Dust Opacity').onChange((value) => { materialOverlayFine.opacity = value; });
  fRender.add(renderParams, 'fineDensity', 0.1, 2.0, 0.01).name('Dust Density').onChange(() => updateFineTexture());
  fRender.add(renderParams, 'cutScale', 0.1, 3.0, 0.01).name('Cut Scale').onChange(() => updateAllVeinsTextures());
  fRender.add(renderParams, 'cutThreshold', 0.0, 0.9, 0.01).name('Cut Width').onChange((value) => {
    veinsMaterials.forEach((material) => {
      material.alphaTest = value;
      material.needsUpdate = true;
    });
  });
  fRender.add(renderParams, 'metalness', 0, 1, 0.01).name('Metalness').onChange((value) => { materialMetal.metalness = value; });
  fRender.add(renderParams, 'roughness', 0, 1, 0.01).name('Roughness').onChange((value) => { materialMetal.roughness = value; });

  const fActions = gui.addFolder('QR Operations');
  fActions.add(actions, 'createQR').name('Create QR');
  fActions.add(actions, 'updateQR').name('Update QR');
  fActions.add(actions, 'enableQR').name('Enable QR');
  fActions.add(actions, 'disableQR').name('Disable QR');
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

buildGui();
syncDynamicRoute();
queueRouteSync({ quiet: true });
generateQR();
syncRuntimePanels();
animate();

window.enterpriseQRApi = Object.freeze({
  createQRCode,
  updateQRCode,
  enableQRCode,
  disableQRCode,
  updateDestinationDynamically,
  exportQRCode,
  applyVisualStylesSafely,
  getConfig: () => deepClone(enterpriseConfig),
  getDynamicPayloadUrl,
  getDynamicRouteSnapshot: () => deepClone(Object.fromEntries(runtime.dynamicRoutingTable.entries())),
  getAnalyticsQueue: () => deepClone(runtime.analyticsQueue),
  addAnalyticsEvent
});
