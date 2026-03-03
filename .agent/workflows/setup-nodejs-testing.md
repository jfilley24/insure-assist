---
description: Setup Node.js testing infrastructure using Vitest and Supertest
---
# Setup Node.js Testing Infrastructure (Vitest + Supertest)

The testing setup is built using a modern, extremely popular combination of two tools: Vitest and Supertest.

*   **Vitest**: The core testing framework. It finds your test files, runs them, and prints results. It's incredibly fast and works with modern JavaScript (ES Modules) out of the box without needing complex configuration.
*   **Supertest**: A specialized library for testing HTTP servers. It allows you to simulate clicking buttons or sending API requests to your Express app without actually having to start a web server on a real port.

## Step 1: Install the packages
Install the core testing framework and HTTP assertions library:

```bash
npm install --save-dev vitest supertest
```

## Step 2: Add the test script
Open your `package.json` file and add the `test` command to the "scripts" section:

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "vitest run"
  }
}
```
*(Note: Using just `vitest` instead of `vitest run` will start it in "Watch Mode", where it stays open and automatically re-runs your tests every time you save a file!)*

## Step 3: Write a Test
Create a `tests` folder and add a file like `api.test.js`. Vitest automatically finds any file ending in `.test.js`.

Ensure you export your Express app directly (e.g., `export const app = express()`) in your server file, and pass it into Supertest:

```javascript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.mjs'; // Import your Express app!

describe('API Endpoints', () => {
    it('should return health status', async () => {
        // Supertest fakes a network request to the app
        const response = await request(app).get('/health');
        
        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
    });
});
```

## Step 4: Run it!
Run `npm test` in the terminal, and Vitest will grab that file, feed your Express app into Supertest, run the fake request, and tell you if it passed!
