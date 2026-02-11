/**
 * Postman Collection Generator from OpenAPI Spec
 * Phase 7 Feature - Generate Postman collection from Swagger spec
 */

const swaggerSpec = require('./swagger-config');

/**
 * Convert OpenAPI 3.0 spec to Postman Collection v2.1
 */
function generatePostmanCollection() {
  const collection = {
    info: {
      name: swaggerSpec.info.title || 'Let\'s Connect API',
      description: swaggerSpec.info.description || 'API Collection',
      version: swaggerSpec.info.version || '1.0.0',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{bearer_token}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'base_url',
        value: swaggerSpec.servers?.[0]?.url || 'http://localhost:8000',
        type: 'string'
      },
      {
        key: 'bearer_token',
        value: '',
        type: 'string'
      }
    ],
    item: []
  };

  // Group endpoints by tags
  const endpointsByTag = {};

  // Parse paths from OpenAPI spec
  if (swaggerSpec.paths) {
    for (const [path, methods] of Object.entries(swaggerSpec.paths)) {
      for (const [method, details] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const tags = details.tags || ['Uncategorized'];
          
          tags.forEach(tag => {
            if (!endpointsByTag[tag]) {
              endpointsByTag[tag] = [];
            }

            const request = {
              name: details.summary || `${method.toUpperCase()} ${path}`,
              request: {
                method: method.toUpperCase(),
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    type: 'text'
                  }
                ],
                url: {
                  raw: `{{base_url}}${path}`,
                  host: ['{{base_url}}'],
                  path: path.split('/').filter(p => p)
                },
                description: details.description || ''
              }
            };

            // Add query parameters
            if (details.parameters) {
              const queryParams = details.parameters
                .filter(p => p.in === 'query')
                .map(p => ({
                  key: p.name,
                  value: p.example || '',
                  description: p.description || '',
                  disabled: !p.required
                }));

              if (queryParams.length > 0) {
                request.request.url.query = queryParams;
              }

              // Add path variables
              const pathVars = details.parameters
                .filter(p => p.in === 'path')
                .map(p => ({
                  key: p.name,
                  value: p.example || '',
                  description: p.description || ''
                }));

              if (pathVars.length > 0) {
                request.request.url.variable = pathVars;
              }
            }

            // Add request body
            if (details.requestBody) {
              const content = details.requestBody.content?.['application/json'];
              if (content && content.schema) {
                const example = content.example || generateExampleFromSchema(content.schema);
                request.request.body = {
                  mode: 'raw',
                  raw: JSON.stringify(example, null, 2),
                  options: {
                    raw: {
                      language: 'json'
                    }
                  }
                };
              }
            }

            // Add authentication if required
            if (details.security && details.security.length > 0) {
              const securityScheme = details.security[0];
              if (securityScheme.bearerAuth) {
                request.request.auth = {
                  type: 'bearer',
                  bearer: [
                    {
                      key: 'token',
                      value: '{{bearer_token}}',
                      type: 'string'
                    }
                  ]
                };
              }
            }

            endpointsByTag[tag].push(request);
          });
        }
      }
    }
  }

  // Convert tag groups to Postman folders
  for (const [tag, requests] of Object.entries(endpointsByTag)) {
    collection.item.push({
      name: tag,
      item: requests
    });
  }

  return collection;
}

/**
 * Generate example value from OpenAPI schema
 */
function generateExampleFromSchema(schema) {
  if (schema.example) {
    return schema.example;
  }

  if (schema.$ref) {
    // For now, return empty object for references
    return {};
  }

  if (schema.type === 'object') {
    const example = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        example[key] = generateExampleFromSchema(prop);
      }
    }
    return example;
  }

  if (schema.type === 'array') {
    return [generateExampleFromSchema(schema.items || {})];
  }

  if (schema.type === 'string') {
    if (schema.format === 'email') return 'user@example.com';
    if (schema.format === 'uri') return 'https://example.com';
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
    return schema.example || 'string';
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return schema.example || 0;
  }

  if (schema.type === 'boolean') {
    return schema.example || false;
  }

  return null;
}

/**
 * Export as Postman Collection JSON
 */
function exportPostmanCollection() {
  const collection = generatePostmanCollection();
  return JSON.stringify(collection, null, 2);
}

/**
 * Get collection metadata
 */
function getCollectionInfo() {
  const collection = generatePostmanCollection();
  
  let totalRequests = 0;
  collection.item.forEach(folder => {
    totalRequests += folder.item.length;
  });

  return {
    name: collection.info.name,
    version: collection.info.version,
    folders: collection.item.length,
    totalRequests,
    baseUrl: collection.variable.find(v => v.key === 'base_url')?.value
  };
}

module.exports = {
  generatePostmanCollection,
  exportPostmanCollection,
  getCollectionInfo
};
