/**
 * OpenAPI Contract Generator and Route Documentation
 * Workstream D2: Route governance
 * 
 * Generates:
 * - OpenAPI 3.0 specification from route registry
 * - API documentation with examples
 * - Contract change tracking
 * - Deprecation warnings
 */

const { routeRegistry, apiVersions, ROUTE_CLASSES, SLA_TIERS } = require('./route-registry');
const { ERROR_CATEGORIES } = require('./error-envelope');

/**
 * Generate OpenAPI 3.0 specification
 */
function generateOpenAPISpec(version = 'v1') {
    const spec = {
        openapi: '3.0.3',
        info: {
            title: "Let's Connect API Gateway",
            version: version,
            description: 'Unified API gateway for Let\'s Connect platform microservices',
            contact: {
                name: 'Platform Team',
                email: 'platform@letsconnect.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:8000',
                description: 'Development server'
            },
            {
                url: 'https://api.letsconnect.com',
                description: 'Production server'
            }
        ],
        tags: generateTags(),
        paths: generatePaths(version),
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from /user/login'
                },
                adminSecret: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-admin-secret',
                    description: 'Admin API secret for admin endpoints'
                }
            },
            schemas: generateSchemas(),
            responses: generateCommonResponses()
        },
        security: []
    };

    return spec;
}

/**
 * Generate tags from service names
 */
function generateTags() {
    const services = [...new Set(routeRegistry.map(r => r.service))];

    return services.map(service => ({
        name: service,
        description: `${service} endpoints`
    }));
}

/**
 * Generate paths from route registry
 */
function generatePaths(version) {
    const paths = {};

    const versionRoutes = routeRegistry.filter(r => r.version === version);

    versionRoutes.forEach(route => {
        const path = route.path;

        if (!paths[path]) {
            paths[path] = {};
        }

        route.methods.forEach(method => {
            const methodLower = method.toLowerCase();
            paths[path][methodLower] = generateOperation(route, method);
        });
    });

    return paths;
}

/**
 * Generate operation object for a route/method
 */
function generateOperation(route, method) {
    const operation = {
        summary: route.description,
        description: `${route.description}\n\n**Service:** ${route.service}\n**SLA:** ${route.sla}\n**Owner:** ${route.owner}`,
        tags: [route.service],
        operationId: `${route.service}_${route.path.replace(/[\/\*:]/g, '_')}_${method}`,
        parameters: generateParameters(route, method),
        responses: generateResponses(route, method)
    };

    // Add security requirements based on route class
    if (route.class === ROUTE_CLASSES.AUTHENTICATED) {
        operation.security = [{ bearerAuth: [] }];
    } else if (route.class === ROUTE_CLASSES.ADMIN) {
        operation.security = [{ bearerAuth: [], adminSecret: [] }];
    }

    // Add deprecation warning
    if (route.deprecated) {
        operation.deprecated = true;
        operation.description += '\n\n⚠️ **DEPRECATED** - This endpoint will be removed in a future version.';
    }

    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        operation.requestBody = generateRequestBody(route, method);
    }

    return operation;
}

/**
 * Generate parameters (path, query, header)
 */
function generateParameters(route, method) {
    const parameters = [];

    // Add path parameters
    const pathParams = route.path.match(/:(\w+)/g);
    if (pathParams) {
        pathParams.forEach(param => {
            const paramName = param.substring(1);
            parameters.push({
                name: paramName,
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: `${paramName} identifier`
            });
        });
    }

    // Add common query parameters for GET
    if (method === 'GET' && route.path.includes('posts') || route.path.includes('products')) {
        parameters.push(
            {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', minimum: 1, default: 1 },
                description: 'Page number for pagination'
            },
            {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                description: 'Number of items per page'
            },
            {
                name: 'sort',
                in: 'query',
                schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
                description: 'Sort order'
            }
        );
    }

    return parameters;
}

/**
 * Generate responses for operation
 */
function generateResponses(route, method) {
    const responses = {
        '200': {
            description: 'Successful response',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: true },
                            data: { type: 'object' },
                            meta: {
                                type: 'object',
                                properties: {
                                    requestId: { type: 'string', format: 'uuid' },
                                    timestamp: { type: 'string', format: 'date-time' }
                                }
                            }
                        }
                    }
                }
            }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
        '500': { $ref: '#/components/responses/InternalError' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
        '504': { $ref: '#/components/responses/GatewayTimeout' }
    };

    // 201 for POST creation
    if (method === 'POST' && !route.path.includes('login')) {
        responses['201'] = {
            description: 'Resource created',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/SuccessResponse' }
                }
            }
        };
    }

    return responses;
}

/**
 * Generate request body schema
 */
function generateRequestBody(route, method) {
    return {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    description: `Request body for ${route.description}`
                }
            }
        }
    };
}

/**
 * Generate common schemas
 */
function generateSchemas() {
    return {
        SuccessResponse: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
                meta: {
                    type: 'object',
                    properties: {
                        requestId: { type: 'string', format: 'uuid' },
                        timestamp: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        ErrorResponse: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: false },
                error: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', example: 'VALIDATION_ERROR' },
                        message: { type: 'string', example: 'Request validation failed' },
                        details: { type: 'array', items: { type: 'object' } },
                        trace: {
                            type: 'object',
                            properties: {
                                requestId: { type: 'string', format: 'uuid' },
                                timestamp: { type: 'string', format: 'date-time' },
                                path: { type: 'string' },
                                method: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    };
}

/**
 * Generate common error responses
 */
function generateCommonResponses() {
    const responses = {};

    Object.entries(ERROR_CATEGORIES).forEach(([key, category]) => {
        const responseName = key.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');

        responses[responseName] = {
            description: category.message,
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                    example: {
                        success: false,
                        error: {
                            code: category.code,
                            message: category.message,
                            trace: {
                                requestId: '123e4567-e89b-12d3-a456-426614174000',
                                timestamp: '2026-03-10T12:00:00Z',
                                path: '/example/path',
                                method: 'GET'
                            }
                        }
                    }
                }
            }
        };
    });

    return responses;
}

/**
 * Generate route documentation in Markdown
 */
function generateMarkdownDocs() {
    let markdown = '# API Gateway Route Documentation\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;

    // API versions
    markdown += '## API Versions\n\n';
    Object.values(apiVersions).forEach(version => {
        markdown += `### ${version.version} - ${version.status}\n`;
        markdown += `- **Introduced:** ${version.introduced}\n`;
        markdown += `- **Status:** ${version.status}\n`;
        markdown += `- **Notes:** ${version.notes}\n`;
        if (version.deprecated) {
            markdown += `- **⚠️ Deprecated:** ${version.deprecated}\n`;
            markdown += `- **Sunset:** ${version.sunset}\n`;
        }
        markdown += '\n';
    });

    // Group routes by service
    const serviceGroups = {};
    routeRegistry.forEach(route => {
        if (!serviceGroups[route.service]) {
            serviceGroups[route.service] = [];
        }
        serviceGroups[route.service].push(route);
    });

    markdown += '## Routes by Service\n\n';

    Object.entries(serviceGroups).forEach(([service, routes]) => {
        markdown += `### ${service}\n\n`;
        markdown += '| Path | Methods | Class | SLA | Description |\n';
        markdown += '|------|---------|-------|-----|-------------|\n';

        routes.forEach(route => {
            const deprecated = route.deprecated ? ' ⚠️ DEPRECATED' : '';
            markdown += `| \`${route.path}\` | ${route.methods.join(', ')} | ${route.class} | ${route.sla} | ${route.description}${deprecated} |\n`;
        });

        markdown += '\n';
    });

    // Route statistics
    markdown += '## Route Statistics\n\n';
    const stats = require('./route-registry').getRouteStats();
    markdown += `- **Total Routes:** ${stats.total}\n`;
    markdown += `- **Services:** ${stats.services}\n\n`;

    markdown += '**By Classification:**\n';
    Object.entries(stats.byClass).forEach(([key, count]) => {
        markdown += `- ${key}: ${count}\n`;
    });

    markdown += '\n**By SLA Tier:**\n';
    Object.entries(stats.bySLA).forEach(([key, count]) => {
        markdown += `- ${key}: ${count}\n`;
    });

    if (stats.deprecated > 0) {
        markdown += `\n**⚠️ Deprecated Routes:** ${stats.deprecated}\n`;
    }

    return markdown;
}

/**
 * Export contract as JSON file
 */
function exportContract(version = 'v1', format = 'json') {
    const spec = generateOpenAPISpec(version);

    if (format === 'yaml') {
        const yaml = require('js-yaml');
        return yaml.dump(spec);
    }

    return JSON.stringify(spec, null, 2);
}

module.exports = {
    generateOpenAPISpec,
    generateMarkdownDocs,
    exportContract
};
