import type { OpenAPI } from 'openapi-types';
import { OpenAPISpec } from './openapi-spec';
import openapiSchemaToJsonSchema from '@openapi-contrib/openapi-schema-to-json-schema';
import { generateOperationName } from './generate-operation-name';
import { FunctionSchema, OpenAPISchema } from 'types';

export async function convertRawOpenAPISpecToOpenAIFunctions(
  spec: OpenAPI.Document | string,
): Promise<FunctionSchema[]> {
  let convertedSpec;
  if (typeof spec === 'string') {
    try {
      convertedSpec = await OpenAPISpec.fromURL(spec);
    } catch (e) {
      try {
        convertedSpec = OpenAPISpec.fromString(spec);
      } catch (e) {
        throw new Error(`Unable to parse spec from source ${spec}: ${e}`);
      }
    }
  } else {
    convertedSpec = OpenAPISpec.fromObject(spec);
  }
  return convertOpenAPIToFunctions(convertedSpec);
}

const convertOpenAPIToFunctions = (openapi: OpenAPI.Document): FunctionSchema[] => {
  // this reformats all parameters to JSON Schema
  // it's unsafely casted because openapi-types typing gave me too much grief
  const jsonSchema = openapiSchemaToJsonSchema(openapi) as OpenAPISchema;

  const result: FunctionSchema[] = [];

  for (const [path, methods] of Object.entries(jsonSchema.paths)) {
    for (const [method, details] of Object.entries(methods)) {
      const functionSchema: FunctionSchema = {
        name: generateOperationName(details, path, method),
        description: details.description ?? details.summary ?? '',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      if (details.parameters) {
        parseParameters(details.parameters, functionSchema);
      } else if (method === 'post' && details.requestBody) {
        handleBodyMethod(details, functionSchema);
      }

      // Remove empty required array
      if (functionSchema.parameters.required.length === 0) {
        delete functionSchema.parameters.required;
      }

      result.push(functionSchema);
    }
  }

  return result;
};

const parseParameters = (parameters: any[], functionSchema: FunctionSchema) => {
  parameters.forEach((param: any) => {
    functionSchema.parameters.properties[param.name] = {
      type: param.schema.type,
      description: param.description,
      location: param.in, // query, path, header, cookie, body
    };
    if (param.required) {
      functionSchema.parameters.required!.push(param.name);
    }
  });
};

const handleBodyMethod = (details: any, functionSchema: FunctionSchema) => {
  const schema = details.requestBody.content['application/json'].schema;
  functionSchema.parameters.properties = {};
  Object.entries(schema.properties).forEach(([propName, propDetails]) => {
    functionSchema.parameters.properties[propName] = {
      type: (propDetails as any).type,
      description: (propDetails as any).description,
      location: 'body',
    };
    if ((propDetails as any).required) {
      functionSchema.parameters.required!.push(propName);
    }
  });

  if (Array.isArray(schema.required)) {
    functionSchema.parameters.required = schema.required;
  }
};
