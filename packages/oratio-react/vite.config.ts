import { defineReactLibConfig } from '@eventuras/vite-config/react-lib';

// preserveModules (the preset default) keeps one output file per source module,
// so each module's 'use client' directive survives for server-component hosts.
export default defineReactLibConfig({
  entry: 'src/index.ts',
});
