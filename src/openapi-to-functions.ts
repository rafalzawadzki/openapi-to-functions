import type { OpenAPI } from 'openapi-types';
import { OpenAPISpec } from './openapi-spec';
import openapiSchemaToJsonSchema from '@openapi-contrib/openapi-schema-to-json-schema';
import { generateOperationName } from './generate-operation-name';
import { FunctionSchema, OpenAPISchema } from 'types';

interface APIFunctionParameter {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
  example?: any;
  format?: string;
  minimum?: number;
  maximum?: number;
  location?: 'query' | 'header' | 'path' | 'body';
}

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
    if (param['$ref']) {
      // @fixme this is not great; refs should be resolved.
      // OpenAPISpec.getRootReferencedSchema maybe?
      // or find a parser that does this automatically
      return;
    }
    const paramDetails: APIFunctionParameter = {
      type: param.schema.type,
      description: param.description,
      location: param.in, // Add location metadata
    };

    if (param.schema.enum) paramDetails.enum = param.schema.enum;
    if (param.schema.default) paramDetails.default = param.schema.default;
    if (param.schema.example) paramDetails.example = param.schema.example;
    if (param.schema.format) paramDetails.format = param.schema.format;
    if (param.schema.minimum !== undefined) paramDetails.minimum = param.schema.minimum;
    if (param.schema.maximum !== undefined) paramDetails.maximum = param.schema.maximum;

    functionSchema.parameters.properties[param.name] = paramDetails;

    if (param.required) {
      functionSchema.parameters.required!.push(param.name);
    }
  });
};

const handleBodyMethod = (details: any, functionSchema: FunctionSchema) => {
  const schema = details.requestBody.content['application/json'].schema;
  functionSchema.parameters.properties = {};
  Object.entries(schema.properties).forEach(([propName, propDetails]) => {
    const propDetailsTyped = propDetails as any;
    const paramDetails: APIFunctionParameter = {
      type: propDetailsTyped.type,
      description: propDetailsTyped.description,
      location: 'body', // Set location to body for POST method
    };

    if (propDetailsTyped.enum) paramDetails.enum = propDetailsTyped.enum;
    if (propDetailsTyped.default) paramDetails.default = propDetailsTyped.default;
    if (propDetailsTyped.example) paramDetails.example = propDetailsTyped.example;
    if (propDetailsTyped.format) paramDetails.format = propDetailsTyped.format;
    if (propDetailsTyped.minimum !== undefined) paramDetails.minimum = propDetailsTyped.minimum;
    if (propDetailsTyped.maximum !== undefined) paramDetails.maximum = propDetailsTyped.maximum;

    functionSchema.parameters.properties[propName] = paramDetails;

    if (propDetailsTyped.required) {
      functionSchema.parameters.required!.push(propName);
    }
  });

  if (Array.isArray(schema.required)) {
    functionSchema.parameters.required = schema.required;
  }
};
