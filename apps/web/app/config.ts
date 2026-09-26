// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

/**
 * Settings read at runtime from /config.json, so one build serves every
 * installation: the container mounts its own file over the default.
 */
export interface OratioConfig {
  homeserverUrl: string;
}

let loading: Promise<OratioConfig> | null = null;

export function loadConfig(): Promise<OratioConfig> {
  loading ??= fetch('/config.json', { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`config.json: ${response.status}`);
      return response.json() as Promise<OratioConfig>;
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}
