export const expectedPetstoreSchema = [
  {
    name: 'listPets',
    description: 'List all pets',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'How many items to return at one time (max 100)'
        }
      }
    }
  },
  {
    name: 'createPets',
    description: 'Create a pet from a pet name.',
    parameters: {
      type: 'object',
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the pet'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'showPetById',
    description: 'Info for a specific pet',
    parameters: {
      type: 'object',
      properties: {
        petId: {
          type: 'string',
          description: 'The id of the pet to retrieve'
        }
      },
      required: ['petId']
    }
  }
]
