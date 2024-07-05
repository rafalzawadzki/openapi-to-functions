export interface OpenAPISchema extends JSONSchema {
  paths: {
    [path: string]: {
      [method: string]: {
        summary?: string;
        description?: string;
        parameters?: any;
        requestBody?: any;
      };
    };
  };
}

export interface FunctionSchema extends JSONSchema {
  name: string;
  description: string;
  parameters: any;
}
