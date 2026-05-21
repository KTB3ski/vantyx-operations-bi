import {
  createDefaultAiSettings,
  type AiSettings,
  type OpenAiActionPlanModel,
} from './aiActionPlan';

const supportedModels = new Set<OpenAiActionPlanModel>([
  'gpt-5-mini',
  'gpt-5.2',
]);

interface PlanAssistAccessPayload {
  vyntaxPlanAssist?: {
    serviceKey?: string;
    apiKey?: string;
    model?: string;
  };
  serviceKey?: string;
  apiKey?: string;
  model?: string;
}

export function parsePlanAssistAccessFile(text: string): AiSettings {
  let parsed: PlanAssistAccessPayload;
  try {
    parsed = JSON.parse(text) as PlanAssistAccessPayload;
  } catch {
    throw new Error('The selected access file is not valid JSON.');
  }

  const config = parsed.vyntaxPlanAssist || parsed;
  const apiKey = (config.serviceKey || config.apiKey || '').trim();
  if (!apiKey) {
    throw new Error('The selected access file does not include Plan Assist access.');
  }

  return {
    apiKey,
    model: supportedModels.has(config.model as OpenAiActionPlanModel)
      ? (config.model as OpenAiActionPlanModel)
      : createDefaultAiSettings().model,
  };
}

export function buildPlanAssistAccessFile(settings: AiSettings) {
  const payload = {
    vyntaxPlanAssist: {
      serviceKey: settings.apiKey.trim(),
      model: settings.model,
    },
  };

  return JSON.stringify(payload, null, 2);
}
