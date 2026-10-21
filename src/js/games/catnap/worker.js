import { buildLevel } from './levels.js';

self.onmessage = (e) => self.postMessage(buildLevel(e.data));
