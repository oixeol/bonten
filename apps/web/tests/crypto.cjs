/* eslint-disable @typescript-eslint/no-require-imports -- runnable CommonJS self-check, no test framework */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/lib/crypto.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = new Module(filename, module);
mod._compile(compiled, filename);
const { getMyPublicKeyBase64, encryptMessage, decryptMessage } = mod.exports;
const store = new Map();
global.window = {};
global.localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
};

(async () => {
  const [alice, sameAlice] = await Promise.all([getMyPublicKeyBase64('alice'), getMyPublicKeyBase64('alice')]);
  assert.equal(alice, sameAlice, 'concurrent initialization must reuse identity');
  const bob = await getMyPublicKeyBase64('bob');
  assert.notEqual(alice, bob, 'accounts on same browser must not share identity');
  const message = await encryptMessage(JSON.stringify({ text: 'segredo 🔒', media: [{ kind: 'gif', url: 'https://example.com/x.gif' }] }), bob, 'alice', 'bob');
  assert.equal(JSON.stringify(message).includes('segredo'), false);
  assert.equal(await decryptMessage(message, 'alice', 'alice', 'bob'), await decryptMessage(message, 'bob', 'alice', 'bob'));
  assert.equal(JSON.parse(await decryptMessage(message, 'bob', 'alice', 'bob')).text, 'segredo 🔒');
  const second = await encryptMessage('segredo', bob, 'alice', 'bob');
  assert.notEqual(message.iv, second.iv);
  await assert.rejects(decryptMessage({ ...message, ciphertext: Buffer.alloc(32).toString('base64') }, 'bob', 'alice', 'bob'));
  await assert.rejects(decryptMessage(message, 'mallory', 'alice', 'bob'));
  await assert.rejects(decryptMessage(message, 'bob', 'mallory', 'bob'), 'sender identity bound by AAD');
  const mallory = await getMyPublicKeyBase64('mallory');
  await assert.rejects(encryptMessage('changed key', mallory, 'alice', 'bob'), /mudou/);
  await assert.rejects(getMyPublicKeyBase64('alice', bob));
  const aliceBackup = store.get('bonten:e2ee:keys:alice');
  store.delete('bonten:e2ee:keys:alice');
  await assert.rejects(getMyPublicKeyBase64('alice', alice), /ausente/);
  store.set('bonten:e2ee:keys', aliceBackup);
  assert.equal(await getMyPublicKeyBase64('alice', alice), alice, 'legacy migration must match registered identity');
  store.set('bonten:e2ee:keys:alice', '{bad');
  await assert.rejects(getMyPublicKeyBase64('alice'));
  assert.equal(store.get('bonten:e2ee:keys:alice'), '{bad', 'corrupt keys must not be silently replaced');
  console.log('crypto: identity isolation, round trips, reload, tamper, AAD, key pinning, migration, missing/corrupt keys passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
