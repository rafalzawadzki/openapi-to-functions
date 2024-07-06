# OpenAPI to OpenAI Functions

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Twitter](https://img.shields.io/twitter/url/https/twitter.com/langchainai.svg?style=social&label=Follow%20%40Rafal)](https://twitter.com/rafal_makes)

Do you have an OpenAPI file or URL and want to use it in your [Assistants API](https://platform.openai.com/docs/assistants/tools/function-calling/quickstart?lang=node.js) or [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)? Look no further.

## Quick Start

`pnpm add openapi-to-functions`

```typescript
import { convertRawOpenAPISpecToOpenAIFunctions } from 'openapi-to-functions';

const functionsFromUrl = convertRawOpenAPISpecToOpenAIFunctions('https://url.com/openapi.yml');
// or
const functionsFromSpec = convertRawOpenAPISpecToOpenAIFunctions(openApiSpecString);
```

## Example

Input:

```yaml
openapi: 3.1.0
info:
  title: Shop API
  version: 1.0.0
servers:
  - url: 'https://shop.com/api/v1'
paths:
  /order:
    get:
      summary: Retrieve an order by the provided order name
      parameters:
        - in: query
          name: orderName
          required: true
          schema:
            type: string
          description: Order name
```

outputs:

```js
[
  {
    name: 'get_order',
    description: 'Retrieve an order by the provided order name',
    parameters: {
      type: 'object',
      properties: {
        orderName: {
          type: 'string',
          description: 'Order name',
          location: 'query',
        },
      },
      required: ['orderName'],
    },
  },
];
```

Then you can manipulate it further to get to a list of tools:

```typescript
const tools = functionsFromSpec.map((func) => ({
  type: 'function',
  function: func,
}));
```

and use in OpenAI call:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: messages,
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_order',
        description: 'Retrieve an order by the provided order name',
        parameters: {
          type: 'object',
          properties: {
            orderName: {
              type: 'string',
              description: 'Order name',
              location: 'query',
            },
          },
          required: ['orderName'],
        },
      },
    },
  ],
  tool_choice: 'auto',
});
```
