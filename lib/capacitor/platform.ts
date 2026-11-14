'use client';

import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return typeof window !== 'undefined' ? Capacitor.getPlatform() : 'web';
};

export const isAndroid = () => {
  return getPlatform() === 'android';
};

export const isIOS = () => {
  return getPlatform() === 'ios';
};
