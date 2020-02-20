import fs from 'fs';
import { resolve } from 'path';
import { generateSchema, getProgramFromFiles, PartialArgs } from 'typescript-json-schema';

const settings: PartialArgs = {
  required: true,
  strictNullChecks: false,
};

const program = getProgramFromFiles([resolve('./src/types.d.ts')]);

const types = [
  'AutomationTask',
  'AutomationProcess',
  'AutomationRuntime',
  'EventbusMessage',
];

types.forEach(t => {
  const schema = generateSchema(program, t, settings);
  fs.writeFileSync(`./src/schemas/${t}.json`, JSON.stringify(schema, undefined, 2));
});
