import config from '../config.js';

const cfg = global.automationCfg || (global.automationCfg = {
  autoRead: config.autoRead,
  autoReact: config.events?.autoReaction || false,
  autoStatusView: true,
  autoLikeStatus: true
});

export function getAutomationConfig() { return cfg; }
