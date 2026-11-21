# Chandara Backend API

Production-ready backend for the Chandara Creator Platform.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Firestore (Firebase)
- **Cache**: Redis
- **Streaming**: LiveKit
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Logging**: Winston + Morgan
- **Testing**: Jest

## Project Structure

```
src/
├── config/          # Configuration management
├── controllers/     # Request handlers
├── routes/          # API routes
├── services/        # Business logic
├── middleware/      # Express middleware
├── models/          # Data models
├── validators/      # Request validation schemas
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── jobs/            # Background jobs
├── sockets/         # Socket.io handlers
├── docs/            # API documentation
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Linting

```bash
npm run lint
npm run lint:fix
npm run format
```

## Docker

```bash
docker-compose up
```

## API Documentation

API documentation is available in the `src/docs/` directory.

## License

MIT
