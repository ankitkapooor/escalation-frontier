import test from "node:test";
import assert from "node:assert/strict";
import { classifyJev, questions, requestJson } from "../jev/client.ts";
import { classifyReference } from "../llm/client.ts";
test("Jev adapter sends typed questions and reads the official response shape", async () => {
  const original = globalThis.fetch;
  let body: any;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    body = JSON.parse(init!.body as string);
    return Response.json({
      model: "jev-test",
      answers: {
        intent: {
          choice: "card_not_working",
          confidence: 0.7,
          probabilities: { card_not_working: 1 },
        },
        operational_family: { choice: "Card issues", confidence: 0.95 },
        security_sensitive: { noul: 0.1 },
        urgency: { score: 1 },
        information_sufficiency: { score: 3 },
      },
      usage: { input_tokens: 100, output_tokens: 10 },
    });
  };
  try {
    const result = await classifyJev("message", "fixture-key", "test-model");
    assert.equal(body.model, "test-model");
    assert.deepEqual(Object.keys(body.questions), Object.keys(questions));
    assert.equal(body.questions.security_sensitive.type, "noul");
    assert.equal(result.prediction.label, "card_not_working");
    assert.equal(result.prediction.familyConfidence, 0.95);
    assert.equal(result.securityProbability, 0.1);
    assert.ok(result.prediction.latencyMs >= 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("upstream failures never expose response bodies", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("secret-sensitive-body", { status: 401 });
  try {
    await assert.rejects(requestJson("https://example.com", {}), {
      message:
        "Model request failed (HTTP 401). Check credentials, model access, or retry later.",
    });
  } finally {
    globalThis.fetch = original;
  }
});
test("reference uses a forced typed tool and records token usage", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.tool_choice.name, "route");
    return Response.json({
      model: "reference-test",
      content: [
        {
          type: "tool_use",
          name: "route",
          input: { label: "card_not_working", confidence: 0.9 },
        },
      ],
      usage: { input_tokens: 120, output_tokens: 20 },
    });
  };
  try {
    const result = await classifyReference("message", "fixture-key");
    assert.equal(result.label, "card_not_working");
    assert.equal(result.usage?.input_tokens, 120);
  } finally {
    globalThis.fetch = original;
  }
});
