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
          description: 'Shop name'
        },
        orderName: {
          type: 'string',
          description: 'Order name'
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
          description: 'Shop name'
        },
        searchQuery: {
          type: 'string',
          description:
            'Query to search'
        }
      },
      required: ['shopName', 'searchQuery']
    }
  }
]
