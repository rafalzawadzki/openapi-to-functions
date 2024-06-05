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

outputs:

```json
[
  {
    name: "getCurrentTemperature",
    description: "Get the current temperature for a specific location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g., San Francisco, CA",
        },
        unit: {
          type: "string",
          enum: ["Celsius", "Fahrenheit"],
          description:
            "The temperature unit to use. Infer this from the user's location.",
        },
      },
      required: ["location", "unit"],
    },
    ...
]
```

Then you can manipulate it further to get to a list of tools:

```typescript
functionsFromSpec.map((func) => ({
  type: 'function',
  function: func,
}));
```
