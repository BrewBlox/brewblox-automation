import fs from 'fs';
import { resolve } from 'path';
import { generateSchema, getProgramFromFiles, PartialArgs } from 'typescript-json-schema';

const settings: PartialArgs = {
  required: true,
  strictNullChecks: false,
};

const program = getProgramFromFiles([resolve('./src/types.ts')]);

const types = [
  'AutomationProcess',
  'AutomationStepJump',
  'AutomationTask',
  'AutomationTemplate',
  'StateEvent',
  'SparkStateEvent',
  'SparkPatchEvent',
].sort();

types.forEach(t => {
  const schema = generateSchema(program, t, settings);
  fs.writeFileSync(`./src/schemas/${t}.json`, JSON.stringify(schema, undefined, 2));
});


const generatedIndex = [
  '// This file was automatically generated by dev/schemas.ts',
  ...types.map(t => `import ${t} from './${t}.json';`),
  '',
  'export const schemas = {',
  ...types.map(t => `  ${t},`),
  '};',
  '',
];

fs.writeFileSync('./src/schemas/index.ts', generatedIndex.join('\n'));