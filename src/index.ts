// Inspired by https://github.com/langchain-ai/langchainjs/blob/7e3da29/langchain/src/chains/openai_functions/openapi.ts
import { ChatCompletionCreateParams } from 'openai/resources/chat/index';
import { JsonSchema7ObjectType, JsonSchema7ArrayType, JsonSchema7Type } from 'zod-to-json-schema';
import type { OpenAPIV3_1 } from 'openapi-types';
import { OpenAPISpec } from './openapi-spec';

/**
 * Converts OpenAPI parameters to JSON schema format.
 * @param params The OpenAPI parameters to convert.
 * @param spec The OpenAPI specification that contains the parameters.
 * @returns The JSON schema representation of the OpenAPI parameters.
 */
function convertOpenAPIParamsToJSONSchema(params: OpenAPIV3_1.ParameterObject[], spec: OpenAPISpec) {
  return params.reduce(
    (jsonSchema: JsonSchema7ObjectType, param) => {
      let schema;
      if (param.schema) {
        schema = spec.getSchema(param.schema);
        // eslint-disable-next-line no-param-reassign
        jsonSchema.properties[param.name] = convertOpenAPISchemaToJSONSchema(schema, spec);
      } else if (param.content) {
        const mediaTypeSchema = Object.values(param.content)[0].schema;
        if (mediaTypeSchema) {
          schema = spec.getSchema(mediaTypeSchema);
        }
        if (!schema) {
          return jsonSchema;
        }
        if (schema.description === undefined) {
          schema.description = param.description ?? '';
        }
        // eslint-disable-next-line no-param-reassign
        jsonSchema.properties[param.name] = convertOpenAPISchemaToJSONSchema(schema, spec);
      } else {
        return jsonSchema;
      }
      if (param.required && Array.isArray(jsonSchema.required)) {
        jsonSchema.required.push(param.name);
      }
      return jsonSchema;
    },
    {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: {},
    },
  );
}

// OpenAI throws errors on extraneous schema properties, e.g. if "required" is set on individual ones
/**
 * Converts OpenAPI schemas to JSON schema format.
 * @param schema The OpenAPI schema to convert.
 * @param spec The OpenAPI specification that contains the schema.
 * @returns The JSON schema representation of the OpenAPI schema.
 */
export function convertOpenAPISchemaToJSONSchema(schema: OpenAPIV3_1.SchemaObject, spec: OpenAPISpec): JsonSchema7Type {
  if (schema.type === 'object') {
    return Object.keys(schema.properties ?? {}).reduce(
      (jsonSchema: JsonSchema7ObjectType, propertyName) => {
        if (!schema.properties) {
          return jsonSchema;
        }
        const openAPIProperty = spec.getSchema(schema.properties[propertyName]);
        if (openAPIProperty.type === undefined) {
          return jsonSchema;
        }
        // eslint-disable-next-line no-param-reassign
        jsonSchema.properties[propertyName] = convertOpenAPISchemaToJSONSchema(openAPIProperty, spec);
        if (openAPIProperty.required && jsonSchema.required !== undefined) {
          jsonSchema.required.push(propertyName);
        }
        return jsonSchema;
      },
      {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: {},
      },
    );
  }
  if (schema.type === 'array') {
    return {
      type: 'array',
      items: convertOpenAPISchemaToJSONSchema(schema.items ?? {}, spec),
      minItems: schema.minItems,
      maxItems: schema.maxItems,
    } as JsonSchema7ArrayType;
  }
  return {
    type: schema.type ?? 'string',
    ...(schema.enum && { enum: schema.enum }),
    ...(schema.default !== undefined && { default: schema.default }),
    ...(schema.pattern && { pattern: schema.pattern }),
    ...(schema.exclusiveMinimum !== undefined && {
      exclusiveMinimum: schema.exclusiveMinimum,
    }),
    ...(schema.exclusiveMaximum !== undefined && {
      exclusiveMaximum: schema.exclusiveMaximum,
    }),
  } as JsonSchema7Type;
}

/**
 * Converts an OpenAPI specification to OpenAI functions.
 * @param spec The OpenAPI specification to convert.
 * @returns An object containing the OpenAI functions derived from the OpenAPI specification and a default execution method.
 */
function convertOpenAPISpecToOpenAIFunctions(
  spec: OpenAPISpec,
  serverBaseUrl?: string,
): ChatCompletionCreateParams.Function[] {
  if (!spec.document.paths) {
    return [];
  }
  const openAIFunctions = [];
  const nameToCallMap: Record<string, { method: string; url: string }> = {};
  for (const path of Object.keys(spec.document.paths)) {
    const pathParameters = spec.getParametersForPath(path);
    for (const method of spec.getMethodsForPath(path)) {
      const operation = spec.getOperation(path, method);
      if (!operation) {
        return [];
      }
      const operationParametersByLocation = pathParameters
        .concat(spec.getParametersForOperation(operation))
        .reduce((operationParams: Record<string, OpenAPIV3_1.ParameterObject[]>, param) => {
          if (!operationParams[param.in]) {
            // eslint-disable-next-line no-param-reassign
            operationParams[param.in] = [];
          }
          operationParams[param.in].push(param);
          return operationParams;
        }, {});
      const paramLocationToRequestArgNameMap: Record<string, string> = {
        query: 'params',
        header: 'headers',
        cookie: 'cookies',
        path: 'path_params',
      };
      const requestArgsSchema: Record<string, JsonSchema7ObjectType> & {
        data?:
          | JsonSchema7ObjectType
          | {
              anyOf?: JsonSchema7ObjectType[];
            };
      } = {};
      for (const paramLocation of Object.keys(paramLocationToRequestArgNameMap)) {
        if (operationParametersByLocation[paramLocation]) {
          requestArgsSchema[paramLocationToRequestArgNameMap[paramLocation]] = convertOpenAPIParamsToJSONSchema(
            operationParametersByLocation[paramLocation],
            spec,
          );
        }
      }
      const requestBody = spec.getRequestBodyForOperation(operation);
      if (requestBody?.content !== undefined) {
        const requestBodySchemas: Record<string, JsonSchema7ObjectType> = {};
        for (const [mediaType, mediaTypeObject] of Object.entries(requestBody.content)) {
          if (mediaTypeObject.schema !== undefined) {
            const schema = spec.getSchema(mediaTypeObject.schema);
            requestBodySchemas[mediaType] = convertOpenAPISchemaToJSONSchema(schema, spec) as JsonSchema7ObjectType;
          }
        }
        const mediaTypes = Object.keys(requestBodySchemas);
        if (mediaTypes.length === 1) {
          requestArgsSchema.data = requestBodySchemas[mediaTypes[0]];
        } else if (mediaTypes.length > 1) {
          requestArgsSchema.data = {
            anyOf: Object.values(requestBodySchemas),
          };
        }
      }
      const openAIFunction: ChatCompletionCreateParams.Function = {
        name: OpenAPISpec.getCleanedOperationId(operation, path, method),
        description: operation.description ?? operation.summary ?? '',
        parameters: {
          type: 'object',
          properties: requestArgsSchema,
          // All remaining top-level parameters are required
          required: Object.keys(requestArgsSchema),
        },
      };

      openAIFunctions.push(openAIFunction);
      const baseUrl = (spec.baseUrl ?? serverBaseUrl ?? '').endsWith('/')
        ? (spec.baseUrl ?? serverBaseUrl ?? '').slice(0, -1)
        : spec.baseUrl ?? serverBaseUrl ?? '';
      nameToCallMap[openAIFunction.name] = {
        method,
        url: baseUrl + path,
      };
    }
  }
  return openAIFunctions;
}

/**
 * Take string content or URL
 * @param spec OpenAPISpec or url/file/text string corresponding to one.
 * @param options Custom options passed into the chain
 * @returns OpenAPIChain
 */
export async function convertRawOpenAPISpecToOpenAIFunctions(
  spec: OpenAPIV3_1.Document | string,
  serverBaseUrl?: string,
) {
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
  return convertOpenAPISpecToOpenAIFunctions(convertedSpec, serverBaseUrl);
}
