/**
 * ============================================================
 * HOW INTEGRATION TESTING WORKS IN THIS FILE
 * ============================================================
 *
 * GOAL:
 *   We want to test the Express route logic (status codes, response shape,
 *   error handling) WITHOUT touching the real file system or running Python.
 *   Supertest lets us fire real HTTP requests at the app without binding to
 *   a live port, and vi.mock() replaces real dependencies with fakes.
 *
 * ─────────────────────────────────────────────────────────────
 * vi.mock(modulePath, factory)
 * ─────────────────────────────────────────────────────────────
 *   Replaces an entire module with a fake version for the duration of the
 *   test file. The factory function returns an object whose keys match the
 *   real module's named exports.
 *
 *   Example – replacing getDatasetsList so it never reads the file system:
 *
 *     vi.mock('../../src/main.js', () => ({
 *       getDatasetsList: vi.fn(),   // starts as a no-op; we set return values per test
 *       getModelsList:   vi.fn(),
 *       ...
 *     }));
 *
 *   IMPORTANT: vi.mock() calls are hoisted to the top of the file by Vitest,
 *   so they always run before any imports, even if you write them after an
 *   import statement.
 *
 * ─────────────────────────────────────────────────────────────
 * vi.fn()
 * ─────────────────────────────────────────────────────────────
 *   Creates a "mock function" – a fake that records every call made to it.
 *   By itself it returns undefined; you control its behaviour per test with:
 *
 *     mockReturnValue(value)          – always returns value synchronously
 *     mockResolvedValue(value)        – returns Promise.resolve(value)
 *     mockRejectedValue(error)        – returns Promise.reject(error)
 *     mockImplementation(fn)          – run custom logic instead
 *
 *   Example:
 *     getDatasetsList.mockResolvedValue([{ name: 'cats', path: '/...' }]);
 *     // Now any code that calls getDatasetsList() gets back that array.
 *
 * ─────────────────────────────────────────────────────────────
 * vi.spyOn(object, methodName)
 * ─────────────────────────────────────────────────────────────
 *   Like vi.fn(), but wraps an *existing* method rather than replacing a
 *   whole module. Useful when you only want to intercept one method on an
 *   object while leaving the rest intact.
 *
 *   Here we spy on express.application.listen to prevent the server from
 *   actually binding to port 3001 during tests:
 *
 *     vi.spyOn(express.application, 'listen').mockImplementation(function () {
 *       return this; // return the app so createServer() still works
 *     });
 *
 * ─────────────────────────────────────────────────────────────
 * supertest  –  request(app).get('/route')
 * ─────────────────────────────────────────────────────────────
 *   Supertest takes an Express app object and creates a temporary server on
 *   a random ephemeral port. You can then chain HTTP methods and assertions:
 *
 *     const res = await request(app).get('/get-datasets');
 *     expect(res.status).toBe(200);        // HTTP status code
 *     expect(res.body).toHaveLength(2);    // parsed JSON body
 *
 *   This means tests are completely self-contained – no port conflicts, no
 *   leftover servers to clean up.
 *
 * ─────────────────────────────────────────────────────────────
 * Test lifecycle hooks
 * ─────────────────────────────────────────────────────────────
 *   beforeAll(fn)  – runs once before all tests in this file
 *   afterAll(fn)   – runs once after all tests in this file
 *   beforeEach(fn) – runs before every individual test  (used in unit tests)
 *   afterEach(fn)  – runs after every individual test
 *
 * ─────────────────────────────────────────────────────────────
 * describe / it
 * ─────────────────────────────────────────────────────────────
 *   describe(label, fn) – groups related tests together (maps to one route here)
 *   it(label, fn)       – a single test case; fn is async when using await
 *
 * ============================================================
 * Integration tests for the Express routes in express.js
 * ============================================================
 *
 * The underlying main.js and python.js dependencies are mocked so the tests
 * exercise the full request → route logic → response cycle without touching
 * the real file system or running Python scripts.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// --- Mock route dependencies before importing express.js ---

vi.mock('../../src/main.js', () => ({
  getDatasetsList: vi.fn(),
  getModelsList: vi.fn(),
  createDatasetFolder: vi.fn(),
  getPareidoliaFolderPath: vi.fn(() => '/Users/testuser/Documents/PareidoliaApp'),
  getLocalIP: vi.fn(() => '192.168.1.100'),
}));

vi.mock('../../src/python.js', () => ({
  getVenvPath: vi.fn(() => '/mock/venv'),
  executePythonScript: vi.fn(),
}));

// Prevent createServer() from actually binding to port 3001 during tests.
// Supertest creates its own temporary server on a random port.
vi.spyOn(express.application, 'listen').mockImplementation(function () {
  return this;
});

import createServer from '../../src/express.js';
import { getDatasetsList, getModelsList } from '../../src/main.js';

let app;

beforeAll(() => {
  app = createServer();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ============================================================
// GET /get-datasets
// ============================================================

describe('GET /get-datasets', () => {
  it('returns 200 with a list of datasets', async () => {
    getDatasetsList.mockResolvedValue([
      { name: 'cats', path: '/Users/testuser/Documents/PareidoliaApp/datasets/cats' },
      { name: 'dogs', path: '/Users/testuser/Documents/PareidoliaApp/datasets/dogs' },
    ]);

    const res = await request(app).get('/get-datasets');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('cats');
    expect(res.body[1].name).toBe('dogs');
  });

  it('returns 200 with an empty array when no datasets exist', async () => {
    getDatasetsList.mockResolvedValue([]);

    const res = await request(app).get('/get-datasets');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 with error message when getDatasetsList throws', async () => {
    getDatasetsList.mockRejectedValue(new Error('File system error'));

    const res = await request(app).get('/get-datasets');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'File system error' });
  });

  it('returns objects that include a name and path field', async () => {
    getDatasetsList.mockResolvedValue([
      { name: 'birds', path: '/Users/testuser/Documents/PareidoliaApp/datasets/birds' },
    ]);

    const res = await request(app).get('/get-datasets');

    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('path');
  });
});

// ============================================================
// GET /get-models
// ============================================================

describe('GET /get-models', () => {
  it('returns 200 with a list of models', async () => {
    getModelsList.mockResolvedValue([
      { name: 'cat-detector', path: '/Users/testuser/Documents/PareidoliaApp/models/cat-detector' },
      { name: 'dog-detector', path: '/Users/testuser/Documents/PareidoliaApp/models/dog-detector' },
    ]);

    const res = await request(app).get('/get-models');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('cat-detector');
    expect(res.body[1].name).toBe('dog-detector');
  });

  it('returns 200 with an empty array when no models exist', async () => {
    getModelsList.mockResolvedValue([]);

    const res = await request(app).get('/get-models');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 with error message when getModelsList throws', async () => {
    getModelsList.mockRejectedValue(new Error('Permission denied'));

    const res = await request(app).get('/get-models');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Permission denied' });
  });

  it('returns objects that include a name and path field', async () => {
    getModelsList.mockResolvedValue([
      { name: 'bird-detector', path: '/Users/testuser/Documents/PareidoliaApp/models/bird-detector' },
    ]);

    const res = await request(app).get('/get-models');

    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('path');
  });
});
