export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  type: "Mobile" | "Tablet" | "Desktop";
}

export const DEVICE_PRESETS: DevicePreset[] = [
  // Mobile Devices
  { id: "iphone-15", name: "iPhone 15 / 15 Pro", width: 393, height: 852, type: "Mobile" },
  { id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", width: 430, height: 932, type: "Mobile" },
  { id: "iphone-se", name: "iPhone SE", width: 375, height: 667, type: "Mobile" },
  { id: "google-pixel-8", name: "Google Pixel 8", width: 412, height: 915, type: "Mobile" },
  { id: "samsung-galaxy-s23", name: "Samsung Galaxy S23", width: 360, height: 780, type: "Mobile" },
  { id: "samsung-galaxy-s23-ultra", name: "Samsung Galaxy S23 Ultra", width: 384, height: 813, type: "Mobile" },
  { id: "mobile-generic", name: "Generic Mobile", width: 390, height: 844, type: "Mobile" },

  // Tablet Devices
  { id: "ipad-pro-11", name: "iPad Pro 11\"", width: 834, height: 1194, type: "Tablet" },
  { id: "ipad-pro-12", name: "iPad Pro 12.9\"", width: 1024, height: 1366, type: "Tablet" },
  { id: "ipad-mini", name: "iPad Mini", width: 744, height: 1133, type: "Tablet" },
  { id: "tablet-generic", name: "Generic Tablet", width: 768, height: 1024, type: "Tablet" },

  // Desktop Devices
  { id: "macbook-air-13", name: "MacBook Air 13\"", width: 1280, height: 800, type: "Desktop" },
  { id: "macbook-pro-14", name: "MacBook Pro 14\"", width: 1512, height: 982, type: "Desktop" },
  { id: "macbook-pro-16", name: "MacBook Pro 16\"", width: 1728, height: 1117, type: "Desktop" },
  { id: "desktop-generic", name: "Generic Desktop", width: 1280, height: 800, type: "Desktop" },
  { id: "desktop-hd", name: "HD Desktop (768p)", width: 1366, height: 768, type: "Desktop" },
  { id: "desktop-fhd", name: "Full HD Desktop (1080p)", width: 1920, height: 1080, type: "Desktop" }
];

export function resolveDeviceDimensions(
  breakpoint: string,
  customWidth: number,
  customHeight: number
): { width: number; height: number } {
  // Check if it matches a preset
  const preset = DEVICE_PRESETS.find((d) => d.id === breakpoint);
  if (preset) {
    return { width: preset.width, height: preset.height };
  }

  // Handle old defaults just in case
  if (breakpoint === "desktop") {
    return { width: 1280, height: 800 };
  }
  if (breakpoint === "tablet") {
    return { width: 768, height: 1024 };
  }
  if (breakpoint === "mobile") {
    return { width: 390, height: 844 };
  }

  // Fallback to custom width / height
  return {
    width: Math.max(200, customWidth || 0),
    height: Math.max(200, customHeight || 0)
  };
}
