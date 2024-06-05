import { convertRawOpenAPISpecToOpenAIFunctions } from '../src/index';
import fs from 'fs';
import path from 'path';

// @improve - this test relies on external url and might be flaky

test('Converts an OpenAPI spec correctly', async () => {
  const result = await convertRawOpenAPISpecToOpenAIFunctions(
    'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml',
  );
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'petstore.json'), 'utf-8'));
  expect(result).toEqual(expected);
});

const fetchAndSaveToJsonFile = async (): Promise<void> => {
  const result = await convertRawOpenAPISpecToOpenAIFunctions(
    'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml',
  );
  fs.writeFileSync(path.join(__dirname, 'petstore.json'), JSON.stringify(result));
};
