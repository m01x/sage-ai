#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import kleur from "kleur";
import figlet from "figlet";
import { select } from "@inquirer/prompts";

// ─── version (read from package.json, always in sync) ───────────────────────

const { version } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

const REPO = "m01x/sage-ai";
const BRANCH = `v${version}`;
const BASE_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

// ─── --version / --help ──────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg === "--version" || arg === "-v") {
    console.log(version);
    process.exit(0);
}

if (arg === "--help" || arg === "-h") {
    console.log(`
  sage-ai v${version}

  Installs Sage — your code comprehension genie for OpenCode.

  Usage:
    npx sage-ai            Run the installer
    npx sage-ai --version  Print version
    npx sage-ai --help     Show this help

  More info: https://github.com/${REPO}
`);
    process.exit(0);
}

// ─── files to install ───────────────────────────────────────────────────────

const FILES = [
    { src: "sage/sage.md", dest: "agents/sage.md", inject: true },
    { src: "sage/commands/exp.md", dest: "commands/exp.md" },
    { src: "sage/commands/exp-file.md", dest: "commands/exp-file.md" },
    { src: "sage/commands/flow.md", dest: "commands/flow.md" },
    { src: "sage/commands/why.md", dest: "commands/why.md" },
    { src: "sage/commands/wish.md", dest: "commands/wish.md" },
    { src: "sage/commands/sec.md", dest: "commands/sec.md" },
    { src: "sage/commands/audit.md", dest: "commands/audit.md" },
];

const LANGUAGES = [
    { value: "es", label: "Español", flag: "🇪🇸" },
    { value: "en", label: "English", flag: "🇬🇧" },
    { value: "pt", label: "Português", flag: "🇧🇷" },
    { value: "fr", label: "Français", flag: "🇫🇷" },
    { value: "de", label: "Deutsch", flag: "🇩🇪" },
    { value: "ja", label: "日本語", flag: "🇯🇵" },
    { value: "zh", label: "中文", flag: "🇨🇳" },
    { value: "ko", label: "한국어", flag: "🇰🇷" },
];

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchFile(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
    return res.text();
}

function writeFile(filePath, content) {
    const dir = dirname(filePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, content, "utf8");
}

function injectLanguage(content, langCode) {
    return content.replace(/^language:\s*.+$/m, `language: ${langCode}`);
}

function printBanner() {
    const sage = figlet.textSync("Sage", { font: "ANSI Shadow" });
    const ai = figlet.textSync("AI", { font: "ANSI Shadow" });

    const sageLines = sage.split("\n");
    const aiLines = ai.split("\n");
    const maxLen = Math.max(...sageLines.map(l => l.length));

    const merged = sageLines.map((line, i) =>
        kleur.cyan().bold(line.padEnd(maxLen)) + "  " + kleur.magenta().bold(aiLines[i] ?? "")
    );

    console.log("");
    merged.forEach(line => console.log(line));
    console.log("");
    console.log(kleur.gray("  First learn, then ") + kleur.magenta("v") + kleur.green("i") + kleur.yellow("b") + kleur.blue("e") + kleur.red("~"));
    console.log(kleur.gray("  ─────────────────────────────────────────────────"));
    console.log(kleur.magenta("  Your Genie for OpenCode~"));
    console.log("");
    console.log(kleur.gray("                  ~ by ") + kleur.magenta().bold("m01x"));
    console.log("");
}

function printStep(label) {
    console.log(kleur.gray(`\n  ${label}`));
}

function printFileStatus(dest, ok, reason) {
    if (ok) {
        console.log(kleur.green(`  ✓ ${dest}`));
    } else {
        console.log(kleur.red(`  ✗ ${dest}`) + kleur.gray(` — ${reason}`));
    }
}

// ─── main ───────────────────────────────────────────────────────────────────

printBanner();

process.on("uncaughtException", (err) => {
    if (err.name === "ExitPromptError") {
        console.log(kleur.gray("\n  Cancelled. See you later~\n"));
        process.exit(0);
    }
    throw err;
});

// ─── step 1: install location ───────────────────────────────────────────────

const choice = await select({
    message: kleur.white("  Where do you want to install Sage?"),
    choices: [
        {
            name: kleur.cyan().bold("🏠  Local") + kleur.gray("   · only this project  (.opencode/)"),
            value: "local",
            short: "Local",
        },
        {
            name: kleur.magenta().bold("🌍  Global") + kleur.gray("  · all your projects  (~/.config/opencode/)"),
            value: "global",
            short: "Global",
        },
    ],
    theme: {
        prefix: "",
        style: {
            highlight: (text) => kleur.cyan(text),
            selectedChoice: (text) => kleur.cyan().bold(text),
        },
    },
});

// ─── step 2: language ───────────────────────────────────────────────────────

console.log("");

const langChoice = await select({
    message: kleur.white("  Default language for Sage reports:"),
    choices: LANGUAGES.map(l => ({
        name: kleur.white(`${l.flag}  ${l.label}`),
        value: l.value,
        short: l.label,
    })),
    theme: {
        prefix: "",
        style: {
            highlight: (text) => kleur.cyan(text),
            selectedChoice: (text) => kleur.cyan().bold(text),
        },
    },
});

const langLabel = LANGUAGES.find(l => l.value === langChoice).label;

console.log("");
console.log(
    kleur.gray("  You can always chat with Sage in any language."),
);
console.log(
    kleur.gray("  Reports will default to ") +
    kleur.cyan(langLabel) +
    kleur.gray(".")
);

// ─── step 3: download & install ─────────────────────────────────────────────

const isGlobal = choice === "global";

const baseDir = isGlobal
    ? join(homedir(), ".config", "opencode")
    : join(process.cwd(), ".opencode");

console.log("");
console.log(
    kleur.gray("  Destination: ") +
    (isGlobal ? kleur.magenta(baseDir) : kleur.cyan(baseDir))
);
console.log(
    kleur.gray("  Version: ") + kleur.cyan(BRANCH)
);

printStep("Fetching latest version from GitHub...\n");

const failed = [];

for (const file of FILES) {
    const url = `${BASE_URL}/${file.src}`;
    const destPath = join(baseDir, file.dest);

    try {
        let content = await fetchFile(url);

        if (file.inject) {
            content = injectLanguage(content, langChoice);
        }

        writeFile(destPath, content);
        printFileStatus(file.dest, true);
    } catch (err) {
        printFileStatus(file.dest, false, err.message);
        failed.push({ file: file.dest, reason: err.message });
    }
}

console.log("");

if (failed.length > 0) {
    console.log(kleur.yellow("  Some files could not be downloaded."));
    console.log(kleur.gray(`  Visit: https://github.com/${REPO}\n`));
    process.exit(1);
}

console.log(kleur.green().bold("  ✦ Sage installed successfully!"));
console.log("");

if (isGlobal) {
    console.log(kleur.gray("  Available in") + kleur.white(" every project") + kleur.gray("."));
} else {
    console.log(kleur.gray("  Available in") + kleur.white(" this project") + kleur.gray("."));
}

console.log(
    kleur.gray("  Switch to Sage with ") +
    kleur.cyan("Tab") +
    kleur.gray(" inside OpenCode.")
);

console.log("");
console.log(kleur.gray("  ─────────────────────────────────────────────────"));
console.log(kleur.gray("  Commands:"));
console.log("");
console.log(kleur.cyan("  /exp       ") + kleur.white("  🗺️  explain the project"));
console.log(kleur.cyan("  /exp-file  ") + kleur.white("  🔎  explain a specific file"));
console.log(kleur.cyan("  /flow      ") + kleur.white("  🔀  visualize module relationships"));
console.log(kleur.cyan("  /wish      ") + kleur.white("  🧞  your learning companion — guided plans with memory"));
console.log(kleur.cyan("  /why       ") + kleur.white("  💭  archaeology of design decisions"));
console.log(kleur.cyan("  /sec       ") + kleur.white("  🛡️  heuristic security read"));
console.log(kleur.cyan("  /audit     ") + kleur.white("  📋  friendly craft audit"));
console.log("");
console.log(kleur.gray("  ─────────────────────────────────────────────────"));
console.log(kleur.magenta("  Your Genie for OpenCode~"));
console.log("");