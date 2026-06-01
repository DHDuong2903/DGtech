import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const { connectDB, sequelize } = await import("../dist/libs/db.js");
const { syncModels } = await import("../dist/libs/syncModels.js");
const { generateChatReply } = await import("../dist/services/aiChatService.js");

function parseArgs(argv) {
  const args = {
    cases: path.join(__dirname, "ai-eval-cases.json"),
    outDir: path.join(repoRoot, "reports", "ai-evals"),
    limit: null,
    category: "",
    userId: null,
  };

  for (const raw of argv) {
    const [key, ...rest] = raw.split("=");
    const value = rest.join("=");
    if (key === "--cases" && value) args.cases = path.resolve(value);
    if (key === "--outDir" && value) args.outDir = path.resolve(value);
    if (key === "--limit" && value) args.limit = Math.max(1, Number.parseInt(value, 10) || 0) || null;
    if (key === "--category" && value) args.category = value.trim();
    if (key === "--userId" && value) args.userId = value.trim();
  }

  return args;
}

function normalizeText(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesNeedle(reply, needle) {
  return normalizeText(reply).includes(normalizeText(needle));
}

function evaluateTurn(reply, turn) {
  const expectedAny = Array.isArray(turn.expectedAny) ? turn.expectedAny : [];
  const expectedAll = Array.isArray(turn.expectedAll) ? turn.expectedAll : [];
  const disallowed = Array.isArray(turn.disallowed) ? turn.disallowed : [];

  const matchedExpectedAny = expectedAny.filter((item) => matchesNeedle(reply, item));
  const missingExpectedAny = expectedAny.filter((item) => !matchesNeedle(reply, item));
  const matchedExpectedAll = expectedAll.filter((item) => matchesNeedle(reply, item));
  const missingExpectedAll = expectedAll.filter((item) => !matchesNeedle(reply, item));
  const matchedDisallowed = disallowed.filter((item) => matchesNeedle(reply, item));

  let autoStatus = "review";
  if (matchedDisallowed.length > 0 || (expectedAll.length > 0 && missingExpectedAll.length > 0)) {
    autoStatus = "fail";
  } else if (expectedAny.length === 0 || matchedExpectedAny.length > 0) {
    autoStatus = "pass";
  }

  return {
    autoStatus,
    matchedExpectedAny,
    missingExpectedAny,
    matchedExpectedAll,
    missingExpectedAll,
    matchedDisallowed,
  };
}

function buildMarkdownReport(report) {
  const lines = [
    "# AI Chatbot Evaluation Report",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Case file: ${report.caseFile}`,
    `- Total cases: ${report.summary.totalCases}`,
    `- Total turns: ${report.summary.totalTurns}`,
    `- Auto pass turns: ${report.summary.autoPassTurns}`,
    `- Auto review turns: ${report.summary.autoReviewTurns}`,
    `- Auto fail turns: ${report.summary.autoFailTurns}`,
    "",
    "## Manual Review Guide",
    "",
    "- Auto status is only a signal.",
    "- Final scoring should still follow `AI_CHATBOT_EVALUATION.md`.",
    "- Recommended manual score per turn: `0`, `1`, or `2`.",
    "",
  ];

  for (const item of report.cases) {
    lines.push(`## ${item.id}`);
    lines.push("");
    lines.push(`- Category: ${item.category}`);
    lines.push(`- Description: ${item.description}`);
    lines.push("");

    for (const turn of item.turns) {
      lines.push(`### Turn ${turn.turnIndex}`);
      lines.push("");
      lines.push(`- User: ${turn.message}`);
      lines.push(`- Auto status: ${turn.autoStatus}`);
      lines.push(`- Expected any: ${turn.expectedAny.length > 0 ? turn.expectedAny.join(", ") : "Khong co"}`);
      lines.push(`- Expected all: ${turn.expectedAll.length > 0 ? turn.expectedAll.join(", ") : "Khong co"}`);
      lines.push(`- Disallowed: ${turn.disallowed.length > 0 ? turn.disallowed.join(", ") : "Khong co"}`);
      lines.push(`- Matched expected any: ${turn.matchedExpectedAny.length > 0 ? turn.matchedExpectedAny.join(", ") : "Khong co"}`);
      lines.push(`- Missing expected all: ${turn.missingExpectedAll.length > 0 ? turn.missingExpectedAll.join(", ") : "Khong co"}`);
      lines.push(`- Matched disallowed: ${turn.matchedDisallowed.length > 0 ? turn.matchedDisallowed.join(", ") : "Khong co"}`);
      lines.push(`- Manual score: __`);
      lines.push("");
      lines.push("Reply:");
      lines.push("");
      lines.push("```text");
      lines.push(turn.reply);
      lines.push("```");
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

async function loadCases(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Cases file must be an array");
  }
  return parsed;
}

async function ensureOutputDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function selectCases(cases, options) {
  let selected = [...cases];
  if (options.category) {
    selected = selected.filter((item) => String(item.category || "") === options.category);
  }
  if (options.limit) {
    selected = selected.slice(0, options.limit);
  }
  return selected;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const allCases = await loadCases(options.cases);
  const cases = selectCases(allCases, options);

  if (cases.length === 0) {
    throw new Error("No evaluation cases selected");
  }

  await ensureOutputDir(options.outDir);
  await connectDB();
  await syncModels();

  const caseResults = [];
  let autoPassTurns = 0;
  let autoReviewTurns = 0;
  let autoFailTurns = 0;
  let totalTurns = 0;

  for (const testCase of cases) {
    const history = [];
    const turnResults = [];

    for (let index = 0; index < testCase.turns.length; index += 1) {
      const turn = testCase.turns[index];
      const startedAt = Date.now();
      const response = await generateChatReply(turn.message, history, {
        userId: options.userId || null,
      });
      const durationMs = Date.now() - startedAt;
      const autoEval = evaluateTurn(response.reply, turn);

      if (autoEval.autoStatus === "pass") autoPassTurns += 1;
      else if (autoEval.autoStatus === "fail") autoFailTurns += 1;
      else autoReviewTurns += 1;
      totalTurns += 1;

      turnResults.push({
        turnIndex: index + 1,
        message: turn.message,
        expectedAny: Array.isArray(turn.expectedAny) ? turn.expectedAny : [],
        expectedAll: Array.isArray(turn.expectedAll) ? turn.expectedAll : [],
        disallowed: Array.isArray(turn.disallowed) ? turn.disallowed : [],
        reply: response.reply,
        intent: response.intent,
        sourceTypes: response.sourceTypes,
        model: response.model,
        catalogEnabled: response.catalogEnabled,
        durationMs,
        ...autoEval,
      });

      history.push({ sender: "user", text: turn.message });
      history.push({ sender: "ai", text: response.reply });
    }

    caseResults.push({
      id: testCase.id,
      category: testCase.category,
      description: testCase.description || "",
      turns: turnResults,
    });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = {
    generatedAt: new Date().toISOString(),
    caseFile: path.relative(repoRoot, options.cases).replaceAll("\\", "/"),
    summary: {
      totalCases: caseResults.length,
      totalTurns,
      autoPassTurns,
      autoReviewTurns,
      autoFailTurns,
    },
    cases: caseResults,
  };

  const jsonPath = path.join(options.outDir, `ai-eval-${timestamp}.json`);
  const mdPath = path.join(options.outDir, `ai-eval-${timestamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(mdPath, buildMarkdownReport(report), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        totalCases: report.summary.totalCases,
        totalTurns: report.summary.totalTurns,
        autoPassTurns: report.summary.autoPassTurns,
        autoReviewTurns: report.summary.autoReviewTurns,
        autoFailTurns: report.summary.autoFailTurns,
        jsonReport: path.relative(repoRoot, jsonPath).replaceAll("\\", "/"),
        markdownReport: path.relative(repoRoot, mdPath).replaceAll("\\", "/"),
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await sequelize.close().catch(() => undefined);
}
