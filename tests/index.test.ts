import path from 'path';
import fs from 'fs';
import { expectedShopSchema } from './fixtures/shop-expected';
import { expectedPetstoreSchema } from './fixtures/petstore-expected';
import { OpenAPISpec } from '../src/openapi-spec';
import { convertRawOpenAPISpecToOpenAIFunctions } from '../src';

describe('convertOpenAPIToJSONSchema', () => {
  const loadYamlFile = (filename: string) => {
    const filePath = path.join(__dirname, 'fixtures', filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const api = OpenAPISpec.fromString(fileContents);
    return api;
  };

  test('converts shop.yaml correctly', async () => {
    const spec = loadYamlFile('shop.yaml');
    const result = await convertRawOpenAPISpecToOpenAIFunctions(spec);

    expect(result).toEqual(expectedShopSchema);
  });

  test('converts petstore.yaml correctly', async () => {
    const spec = loadYamlFile('petstore.yaml');
    const result = await convertRawOpenAPISpecToOpenAIFunctions(spec);

    expect(result).toEqual(expectedPetstoreSchema);
  });
});
