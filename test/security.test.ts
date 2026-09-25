import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { ParanodPlugin } from '../src/core/plugin';
import { ExpressServer } from '../src/server/express';
import { InstallationRegistry, type Installation, type InstallationStorage } from '../src/registry/installation';

const servers: http.Server[] = [];
afterEach(async () => { for (const server of servers.splice(0)) await new Promise<void>((resolve) => server.close(() => resolve())); });

async function fixture(token?: string) {
  const plugin = new ParanodPlugin({ id: 'secure', name: 'Secure', version: '1.0.0', author: 'Test', description: 'Test', category: 'network' });
  plugin.enableMultiTenantInMemory();
  plugin.transform({ id: 'lookup', name: 'Lookup', description: 'Test', inputType: 'domain', outputTypes: ['ip'], handler: async () => ({ entities: [], edges: [] }) });
  plugin.asyncTransform({ id: 'scan', name: 'Scan', description: 'Test', inputType: 'domain', outputTypes: ['ip'], handler: async () => ({ entities: [], edges: [] }) });
  const wrapper = new ExpressServer(plugin, { port: 0, multiTenant: true, registrationToken: token });
  const server = http.createServer(wrapper.getApp());
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  const call = (path: string, body?: unknown, headers?: Record<string, string>) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { call };
}

describe('SDK authentication and tenant isolation', () => {
  it('fails closed without bootstrap credentials, including repeat registration and stats', async () => {
    const { call } = await fixture();
    const registration = { workspaceId: 'workspace', platformUrl: 'https://platform.example' };
    expect((await call('/register', registration)).status).toBe(401);
    expect((await call('/stats')).status).toBe(401);
    expect((await call('/lookup', { input: { entity: { id: 'i', type: 'domain', value: 'example.com' } } }, { 'X-Workspace-Id': 'workspace' })).status).toBe(401);
  });

  it('requires the installation secret for transforms and unregister, not just a workspace header', async () => {
    const token = 't'.repeat(32);
    const { call } = await fixture(token);
    const registration = { workspaceId: 'workspace', platformUrl: 'https://platform.example' };
    const registered = await call('/register?token=' + token, registration);
    expect(registered.status).toBe(200);
    const { webhookSecret } = await registered.json() as { webhookSecret: string };
    expect((await call('/register', registration)).status).toBe(401);
    const input = { input: { entity: { id: 'i', type: 'domain', value: 'example.com' } } };
    const headers = { 'X-Workspace-Id': 'workspace', Authorization: 'Bearer ' + webhookSecret };
    expect((await call('/lookup', input, headers)).status).toBe(200);
    expect((await call('/lookup', input, { ...headers, 'X-Workspace-Id': 'other' })).status).toBe(401);
    expect((await call('/unregister', { workspaceId: 'other' }, headers)).status).toBe(400);
    expect((await call('/unregister', { workspaceId: 'workspace' }, headers)).status).toBe(200);
    expect((await call('/lookup', input, headers)).status).toBe(401);
  });

  it('refuses callbacks outside the registered platform and webhook path', async () => {
    const token = 't'.repeat(32);
    const { call } = await fixture(token);
    const result = await call('/register?token=' + token, { workspaceId: 'workspace', platformUrl: 'https://platform.example' });
    const { webhookSecret } = await result.json() as { webhookSecret: string };
    for (const callbackUrl of ['http://127.0.0.1/private', 'https://attacker.example/api/webhooks/transforms/j', 'https://platform.example/admin']) {
      const response = await call('/scan', { input: { entity: { id: 'i', type: 'domain', value: 'example.com' } }, callbackUrl },
        { 'X-Workspace-Id': 'workspace', Authorization: 'Bearer ' + webhookSecret });
      expect(response.status).toBe(400);
    }
  });

  it('uses the public persistent-storage interface to resolve webhook secrets', async () => {
    const records = new Map<string, Installation>();
    const storage: InstallationStorage = {
      get: async id => records.get(id) || null,
      set: async (id, value) => { records.set(id, value); },
      delete: async id => records.delete(id),
      getAll: async () => [...records.values()]
    };
    const registry = new InstallationRegistry('p', '1.0.0', storage);
    const result = await registry.register({ workspaceId: 'workspace', platformUrl: 'https://platform.example' });
    expect(await registry.getSecret('workspace')).toBe(result.webhookSecret);
    expect(await registry.getSecret('missing')).toBeNull();
  });
});
