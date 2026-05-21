import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const rl = createInterface({ input, output });

try {
  const serviceKey = (await rl.question('Paste the Plan Assist service key: ')).trim();
  if (!serviceKey) {
    throw new Error('No service key entered.');
  }

  const modelAnswer = (
    await rl.question('Model [gpt-5-mini]: ')
  ).trim();
  const model = modelAnswer || 'gpt-5-mini';
  const target = resolve('Vyntax_Plan_Assist_Access.json');
  const payload = {
    vyntaxPlanAssist: {
      serviceKey,
      model,
    },
  };

  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'w',
  });
  console.log(`Created ${target}`);
  console.log('Give this file to the operator and have them import it in Action Plan > Plan Assist Access.');
} finally {
  rl.close();
}
