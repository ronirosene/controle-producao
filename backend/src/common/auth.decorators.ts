import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const REQUIRED_FEATURES_KEY = 'requiredFeatures';
export const RequireFeatures = (...features: string[]) =>
  SetMetadata(REQUIRED_FEATURES_KEY, features);

