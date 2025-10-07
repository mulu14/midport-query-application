/**
 * @fileoverview Utility functions for CSS class management
 * @author Mulugeta Forsido
 * @company Midport Scandinavia
 * @date October 2025
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge CSS classes using clsx and tailwind-merge
 * Combines multiple class values and resolves Tailwind CSS conflicts
 * @function cn
 * @param {...ClassValue[]} inputs - Variable number of class values to merge
 * @returns {string} Merged and optimized CSS class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
