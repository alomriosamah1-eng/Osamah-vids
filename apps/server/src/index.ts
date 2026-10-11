// نقطة دخول الخادم.
import { createApp } from './http/server.js';
import { config } from './config.js';
import { applySettings } from './settings.js';

applySettings();
const app = createApp();
const { host, port } = config.server;
app.listen(port, host, () => {
  console.log(`[osamah-vids-ai server] http://${host}:${port}`);
});