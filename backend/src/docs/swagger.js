import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Tabunganku API',
      version: '1.0.0',
      description: `REST API untuk aplikasi Tabunganku.

Fitur:
- Authentication
- Profile
- Savings
- Transactions
- Dashboard
- Shared Savings
- Shared Transactions

Backend menggunakan:
Express.js
Supabase
JWT
Zod
Layered Architecture`
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development'
      },
      {
        url: process.env.BASE_URL || 'http://localhost:5000/api',
        description: 'Production'
      }
    ],
    tags: [
      { name: 'Authentication', description: 'Authentication and token management endpoints' },
      { name: 'Profile', description: 'User profile management endpoints' },
      { name: 'Savings', description: 'Personal savings management endpoints' },
      { name: 'Transactions', description: 'Transaction management endpoints' },
      { name: 'Dashboard', description: 'Dashboard overview and reports endpoints' },
      { name: 'Shared Savings', description: 'Shared savings group management endpoints' },
      { name: 'Shared Transactions', description: 'Shared savings transaction endpoints' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            username: { type: 'string' },
            avatar: { type: 'string' },
            role: { type: 'string' }
          }
        },
        Savings: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            target_amount: { type: 'number', format: 'float' },
            current_amount: { type: 'number', format: 'float' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            savings_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['deposit', 'withdrawal'] },
            amount: { type: 'number', format: 'float' },
            description: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Dashboard: {
          type: 'object',
          properties: {
            total_savings: { type: 'number' },
            total_target: { type: 'number' },
            progress: { type: 'integer' },
            completion_rate: { type: 'integer' },
            remaining_target: { type: 'number' },
            total_transactions: { type: 'integer' },
            total_deposit: { type: 'number' },
            total_withdrawal: { type: 'number' },
            num_savings_goals: { type: 'integer' }
          }
        },
        MonthlyStatistics: {
          type: 'object',
          properties: {
            month: { type: 'string', example: '2026-06' },
            deposit: { type: 'number' },
            withdrawal: { type: 'number' }
          }
        },
        Statistics: {
          type: 'object',
          properties: {
            per_month: {
              type: 'array',
              items: { $ref: '#/components/schemas/MonthlyStatistics' }
            }
          }
        },
        SharedSavings: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            owner_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            target_amount: { type: 'number', format: 'float' },
            current_amount: { type: 'number', format: 'float' },
            invite_code: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        SharedMember: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            shared_savings_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            role: { type: 'string' },
            joined_at: { type: 'string', format: 'date-time' }
          }
        },
        SharedMemberStatistics: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            total_deposit: { type: 'number' },
            total_withdrawal: { type: 'number' }
          }
        },
        SharedTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            shared_savings_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['deposit', 'withdrawal'] },
            amount: { type: 'number', format: 'float' },
            description: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { nullable: true }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {}
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2, example: 'Iki' },
            username: { type: 'string', minLength: 3, maxLength: 30, example: 'iki' },
            email: { type: 'string', format: 'email', example: 'iki@gmail.com' },
            password: { type: 'string', minLength: 8, example: 'Password123' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'iki@gmail.com' },
            password: { type: 'string', example: 'password123' }
          }
        },
        RefreshRequest: {
          type: 'object',
          required: ['refresh_token'],
          properties: {
            refresh_token: { type: 'string' }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Iki' },
            avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.png' },
            username: { type: 'string', example: 'iki' }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['old_password', 'new_password'],
          properties: {
            old_password: { type: 'string', example: 'oldPassword123' },
            new_password: { type: 'string', minLength: 8, example: 'newPassword123' }
          }
        },
        CreateSavingsRequest: {
          type: 'object',
          required: ['name', 'target_amount'],
          properties: {
            name: { type: 'string', example: 'Beli Laptop' },
            target_amount: { type: 'number', format: 'float', example: 8000000 }
          }
        },
        UpdateSavingsRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            target_amount: { type: 'number', format: 'float' }
          }
        },
        CreateTransactionRequest: {
          type: 'object',
          required: ['savings_id', 'type', 'amount', 'description'],
          properties: {
            savings_id: { type: 'string', format: 'uuid', example: '11111111-1111-1111-1111-111111111111' },
            type: { type: 'string', enum: ['deposit', 'withdrawal'], example: 'deposit' },
            amount: { type: 'number', format: 'float', example: 100000 },
            description: { type: 'string', example: 'Gaji bulan Juli' }
          }
        },
        UpdateTransactionRequest: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['deposit', 'withdrawal'] },
            amount: { type: 'number', format: 'float' },
            description: { type: 'string' }
          }
        },
        CreateSharedSavingsRequest: {
          type: 'object',
          required: ['name', 'description', 'target_amount'],
          properties: {
            name: { type: 'string', example: 'Liburan Bali' },
            description: { type: 'string', example: 'Tabungan bersama untuk liburan' },
            target_amount: { type: 'number', format: 'float', example: 5000000 }
          }
        },
        JoinSharedSavingsRequest: {
          type: 'object',
          required: ['invite_code'],
          properties: {
            invite_code: { type: 'string', example: 'ABCD123' }
          }
        },
        CreateSharedTransactionRequest: {
          type: 'object',
          required: ['shared_savings_id', 'type', 'amount', 'description'],
          properties: {
            shared_savings_id: { type: 'string', format: 'uuid', example: '22222222-2222-2222-2222-222222222222' },
            type: { type: 'string', enum: ['deposit', 'withdrawal'], example: 'deposit' },
            amount: { type: 'number', format: 'float', example: 500000 },
            description: { type: 'string', example: 'Setoran anggota' }
          }
        },
        UpdateSharedTransactionRequest: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['deposit', 'withdrawal'] },
            amount: { type: 'number', format: 'float' },
            description: { type: 'string' }
          }
        },
        UpdateSharedSavingsRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            target_amount: { type: 'number', format: 'float' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export { swaggerSpec, swaggerUi };
export default swaggerSpec;
