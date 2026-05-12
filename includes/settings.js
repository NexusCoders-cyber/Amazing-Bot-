import fs from "fs";
import path from "path";

const settingsPath = path.resolve("data/settings.json");

function ensureSettings() {
  if (!fs.existsSync(settingsPath)) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          onlyAdminMode: {
            enabled: false
          }
        },
        null,
        2
      )
    );
  }
}

export function getSettings() {
  ensureSettings();
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch (err) {
    console.error("Failed to read settings:", err);
    return { onlyAdminMode: { enabled: false } };
  }
}

export function saveSettings(data) {
  ensureSettings();
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}
