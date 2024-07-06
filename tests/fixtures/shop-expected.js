export const expectedShopSchema = [
  {
    name: 'get_order',
    description:
      'Retrieve an order by the provided order name',
    parameters: {
      type: 'object',
      properties: {
        shopName: {
          type: 'string',
          description: 'Shop name',
          location: 'query'
        },
        orderName: {
          type: 'string',
          description: 'Order name',
          location: 'query'
        }
      },
      required: ['shopName', 'orderName']
    }
  },
  {
    name: 'get_products',
    description: 'Search products in the store using the provided query',
    parameters: {
      type: 'object',
      properties: {
        shopName: {
          type: 'string',
          description: 'Shop name',
          location: 'query'
        },
        searchQuery: {
          type: 'string',
          description:
            'Query to search',
          location: 'query'
        }
      },
      required: ['shopName', 'searchQuery']
    }
  }
]
