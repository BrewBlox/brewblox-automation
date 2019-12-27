
jest.mock('../src/args', () => ({
  name: 'automation',
  port: '5000',
  debug: true,
  database: 'datastore',
  local: true,
}));
