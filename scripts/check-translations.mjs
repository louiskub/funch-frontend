import { readFile } from "node:fs/promises";

const files = {
  en: new URL("../src/features/i18n/messages/en.json", import.meta.url),
  th: new URL("../src/features/i18n/messages/th.json", import.meta.url),
};
const messages = {};
let failed = false;

if (duplicateKeys('{"probe": 1, "probe": 2}').length !== 1) {
  throw new Error("Duplicate-key checker failed its self-check.");
}

for (const [locale, file] of Object.entries(files)) {
  const source = await readFile(file, "utf8");
  try {
    messages[locale] = JSON.parse(source);
  } catch (error) {
    console.error(`${locale}: invalid JSON: ${error.message}`);
    failed = true;
    continue;
  }

  for (const keyPath of duplicateKeys(source)) {
    console.error(`${locale}: duplicate key ${keyPath}`);
    failed = true;
  }
}

if (messages.en && messages.th) compare(messages.en, messages.th);
if (failed) process.exitCode = 1;
else console.log("EN/TH translation keys and placeholders match; no duplicate keys found.");

function duplicateKeys(source) {
  const duplicates = [];
  let index = 0;

  function whitespace() {
    while (/\s/.test(source[index] ?? "")) index += 1;
  }

  function string() {
    const start = index;
    index += 1;
    while (index < source.length) {
      if (source[index] === "\\") index += 2;
      else if (source[index++] === '"') return JSON.parse(source.slice(start, index));
    }
    return "";
  }

  function value(path = []) {
    whitespace();
    if (source[index] === "{") {
      index += 1;
      whitespace();
      const keys = new Set();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      while (index < source.length) {
        whitespace();
        const key = string();
        if (keys.has(key)) duplicates.push([...path, key].join("."));
        keys.add(key);
        whitespace();
        index += 1;
        value([...path, key]);
        whitespace();
        if (source[index] === "}") {
          index += 1;
          return;
        }
        index += 1;
      }
    } else if (source[index] === "[") {
      index += 1;
      whitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      while (index < source.length) {
        value(path);
        whitespace();
        if (source[index] === "]") {
          index += 1;
          return;
        }
        index += 1;
      }
    } else if (source[index] === '"') {
      string();
    } else {
      while (index < source.length && !/[,[\]}\s]/.test(source[index])) index += 1;
    }
  }

  value();
  return duplicates;
}

function compare(english, thai, path = []) {
  const enObject = english !== null && typeof english === "object";
  const thObject = thai !== null && typeof thai === "object";
  if (enObject || thObject) {
    if (!enObject || !thObject || Array.isArray(english) || Array.isArray(thai)) {
      console.error(`${path.join(".")}: locale values have different shapes`);
      failed = true;
      return;
    }
    for (const key of new Set([...Object.keys(english), ...Object.keys(thai)])) {
      if (!(key in english)) {
        console.error(`en missing ${[...path, key].join(".")}`);
        failed = true;
      } else if (!(key in thai)) {
        console.error(`th missing ${[...path, key].join(".")}`);
        failed = true;
      } else {
        compare(english[key], thai[key], [...path, key]);
      }
    }
    return;
  }

  if (typeof english !== "string" || typeof thai !== "string") {
    console.error(`${path.join(".")}: locale values must be strings`);
    failed = true;
    return;
  }
  if (placeholders(english) !== placeholders(thai)) {
    console.error(`${path.join(".")}: placeholder sets differ`);
    failed = true;
  }
}

function placeholders(message) {
  return [...message.matchAll(/\{([\w]+)(?:[,}])/g)]
    .map((match) => match[1])
    .sort()
    .join(",");
}
