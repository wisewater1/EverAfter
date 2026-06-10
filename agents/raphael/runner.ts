import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { z } from 'zod';
import manifest from './manifest.json';
import { checkConsent } from '../../server/lib/consent';
import { createAuditLog } from '../../server/lib/audit';
import * as tools from './tools';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RunInput {
  userId: string;
  goals?: string;
  lookbackDays?: number;
  manual?: boolean;
}

interface RunOutput {
  runId: string;
  insights: Array<{
    text: string;
    severity: 'info' | 'warning' | 'attention';
    category: string;
  }>;
  suggestion: string;
  tokensUsed: number;
  engramsCreated: number;
}

const insightsSchema = z.object({
  insights: z.array(
    z.object({
      text: z.string(),
      severity: z.enum(['info', 'warning', 'attention']),
      category: z.string(),
    })
  ),
  suggestion: z.string(),
});

export async function runRaphael(input: RunInput): Promise<RunOutput> {
  const startTime = Date.now();
  const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`🩺 Starting Raphael run ${runId} for user ${input.userId}`);

  const run = await prisma.agentRun.create({
    data: {
      id: runId,
      userId: input.userId,
      agentId: manifest.id,
      status: 'running',
    },
  });

  try {
    const lookbackDays = input.lookbackDays || 3;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - lookbackDays);

    const metrics = await tools.fetchMetrics({
      userId: input.userId,
      types: ['HEART_RATE', 'HRV', 'STEPS', 'SLEEP_DURATION', 'GLUCOSE'],
      from: fromDate,
      to: new Date(),
    });

    if (metrics.length === 0) {
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          steps: { message: 'No metrics available for analysis' },
        },
      });

      return {
        runId,
        insights: [
          {
            text: 'No health data available yet. Connect your devices to start receiving insights.',
            severity: 'info',
            category: 'onboarding',
          },
        ],
        suggestion: 'Connect a fitness tracker or health app to begin tracking your wellness journey.',
        tokensUsed: 0,
        engramsCreated: 0,
      };
    }

    const metricsSummary = summarizeMetrics(metrics);

    const systemPrompt = `${manifest.persona.system}

You will analyze ${lookbackDays} days of health data and provide:
1. Three concise insights (each 1-2 sentences)
2. One actionable suggestion

Guidelines:
- Focus on trends and patterns, not isolated points
- Use percentages and comparisons
- Be specific but avoid medical diagnosis
- Categorize insights as: trend, anomaly, achievement, or concern
- Assign severity: info, warning, or attention

User goals: ${input.goals || 'General wellness'}`;

    const userPrompt = `Health Data Summary (${lookbackDays} days):

${metricsSummary}

Provide insights and a suggestion in JSON format:
{
  "insights": [
    {"text": "...", "severity": "info", "category": "trend"},
    {"text": "...", "severity": "warning", "category": "anomaly"},
    {"text": "...", "severity": "info", "category": "achievement"}
  ],
  "suggestion": "..."
}`;

    const completion = await openai.chat.completions.create({
      model: manifest.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: manifest.guardrails.maxTokens,
      temperature: 0.7,
    });

    const tokensUsed = completion.usage?.total_tokens || 0;
    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = insightsSchema.parse(JSON.parse(responseText));

    const hasConsent = await checkConsent(input.userId, 'train');
    let engramsCreated = 0;

    if (hasConsent) {
      for (const insight of parsed.insights) {
        await tools.writeEngram({
          userId: input.userId,
          kind: 'raphael-insight',
          text: insight.text,
          tags: [insight.category, `severity-${insight.severity}`],
          metadata: {
            runId,
            lookbackDays,
            manual: input.manual || false,
          },
        });
        engramsCreated++;
      }

      await createAuditLog({
        userId: input.userId,
        action: 'raphael.engrams.created',
        metadata: { runId, count: engramsCreated },
      });
    }

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        tokensUsed,
        steps: {
          metricsAnalyzed: metrics.length,
          insightsGenerated: parsed.insights.length,
          engramsCreated,
          hasConsent,
        },
        completedAt: new Date(),
      },
    });

    const duration = Date.now() - startTime;
    console.log(
      `✅ Raphael run ${runId} completed in ${duration}ms (${tokensUsed} tokens)`
    );

    return {
      runId,
      insights: parsed.insights,
      suggestion: parsed.suggestion,
      tokensUsed,
      engramsCreated,
    };
  } catch (error) {
    console.error(`❌ Raphael run ${runId} failed:`, error);

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

function summarizeMetrics(
  metrics: Array<{
    type: string;
    value: number | null;
    unit: string | null;
    ts: Date;
  }>
): string {
  const grouped = metrics.reduce((acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    if (m.value !== null) acc[m.type].push(m.value);
    return acc;
  }, {} as Record<string, number[]>);

  const lines: string[] = [];

  for (const [type, values] of Object.entries(grouped)) {
    if (values.length === 0) continue;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const sample = metrics.find((m) => m.type === type);
    const unit = sample?.unit || '';

    lines.push(
      `${type}: Avg ${avg.toFixed(1)}${unit}, Range ${min.toFixed(1)}-${max.toFixed(1)}${unit}, Readings: ${values.length}`
    );
  }

  return lines.join('\n');
}
