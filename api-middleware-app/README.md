# API Middleware Application

## Overview
This project is an API middleware application designed to handle various middleware functionalities such as authentication, logging, rate limiting, and error handling. It serves as a robust foundation for building scalable and maintainable APIs.

## Project Structure
```
api-middleware-app
├── src
│   ├── index.ts
│   ├── server.ts
│   ├── middleware
│   │   ├── authentication.ts
│   │   ├── logging.ts
│   │   ├── rateLimiter.ts
│   │   └── errorHandler.ts
│   ├── routes
│   │   └── index.ts
│   ├── controllers
│   │   └── index.ts
│   ├── services
│   │   └── apiProxy.ts
│   ├── config
│   │   └── index.ts
│   ├── utils
│   │   └── httpClient.ts
│   └── types
│       └── index.ts
├── tests
│   └── middleware
│       └── authentication.test.ts
├── .env.example
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd api-middleware-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Run the setup script to create necessary directories and files:
   ```
   npm run setup
   ```
   This will:
   - Create `data/` directory for SQLite database files
   - Create `logs/` directory for application logs
   - Create `.env` file with default environment variables (if it doesn't exist)
   - Initialize the database with required tables (clients, sessions, users, api_logs)

   **Note:** These directories and files are in `.gitignore` and won't be committed to version control. This ensures compatibility across different operating systems (Windows, Linux, macOS) and avoids permission issues.

5. Create an OAuth client for testing:
   ```
   npx ts-node scripts/createClient.ts test_client secret123 "Test Client"
   ```

## Usage
To start the application, run:
```
npm start
```
Or to run on a specific port:
```
PORT=3001 npm start
```
This will initialize the server and set up the middleware and routes.

## Testing

### Automated Tests
To run the automated tests, use:
```
npm test
```

### Manual API Testing
Para testes manuais da API com curl, consulte o arquivo [API_TESTING.md](./API_TESTING.md) que contém:
- Exemplos de requisições para todos os endpoints
- Fluxo completo de autenticação OAuth 2.0
- Testes de cenários de erro
- Scripts úteis para testes automatizados

## Environment Variables
An example of the required environment variables can be found in the `.env.example` file. Make sure to create a `.env` file in the root directory and populate it with the necessary variables.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.