declare module 'react-native-safe-area-context' {
  import type React from 'react';
  import type { ViewProps } from 'react-native';

export const SafeAreaProvider: React.ComponentType<{ children?: React.ReactNode }>;
  export const SafeAreaView: React.ComponentType<ViewProps & { edges?: Array<'top' | 'right' | 'bottom' | 'left'> }>;
}
