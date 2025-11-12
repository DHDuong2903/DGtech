// Validation utilities
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../constants';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Vietnamese format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

/**
 * Validate image file
 */
export const isValidImage = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Chỉ chấp nhận file ảnh (JPG, PNG, WebP)',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Kích thước file không được vượt quá ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
};

/**
 * Validate required field
 */
export const isRequired = (value: string | number | undefined | null): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

/**
 * Validate number range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate positive number
 */
export const isPositive = (value: number): boolean => {
  return value > 0;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
