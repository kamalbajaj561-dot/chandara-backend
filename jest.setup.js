// Mock Firebase before any imports
jest.mock('./src/services/firebase', () => {
  const mockQuery = {
    where: jest.fn(function() { return this; }),
    orderBy: jest.fn(function() { return this; }),
    limit: jest.fn(function() { return this; }),
    startAfter: jest.fn(function() { return this; }),
    offset: jest.fn(function() { return this; }),
    count: jest.fn(function() { 
      return {
        get: jest.fn(() => Promise.resolve({ data: () => ({ count: 0 }) }))
      };
    }),
    get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  };

  const mockTimestamp = {
    toDate: jest.fn(() => new Date()),
    toMillis: jest.fn(() => Date.now()),
    seconds: 0,
    nanoseconds: 0,
  };

  const mockDoc = {
    get: jest.fn(() => Promise.resolve({ exists: false })),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    data: jest.fn(() => ({})),
    exists: false,
    id: 'mock-doc-id',
    ref: {
      delete: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCollection = {
    doc: jest.fn(() => mockDoc),
    where: jest.fn(() => mockQuery),
    orderBy: jest.fn(() => mockQuery),
    limit: jest.fn(() => mockQuery),
    offset: jest.fn(() => mockQuery),
    add: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
    get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  };

  return {
    getFirestore: jest.fn(() => ({
      collection: jest.fn(() => mockCollection),
      batch: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
      })),
      runTransaction: jest.fn((fn) => fn({
        get: jest.fn(() => Promise.resolve({ exists: false })),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      Timestamp: {
        fromDate: jest.fn((date) => mockTimestamp),
        now: jest.fn(() => mockTimestamp),
        fromMillis: jest.fn((ms) => mockTimestamp),
      },
    })),
    getAuth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
  };
});

// Mock Firebase Admin FieldValue
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(),
  auth: jest.fn(),
  FieldValue: {
    increment: jest.fn((val) => ({ _increment: val })),
    serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  },
}));

// Mock Redis before any imports
jest.mock('./src/services/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    incrBy: jest.fn(),
    decrBy: jest.fn(),
    expire: jest.fn(),
    quit: jest.fn(),
  })),
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
  incrementCache: jest.fn(),
  decrementCache: jest.fn(),
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(),
  auth: jest.fn(),
}));

// Mock LiveKit
jest.mock('./src/services/livekit', () => ({
  createRoom: jest.fn(),
  deleteRoom: jest.fn(),
  generateLiveKitToken: jest.fn(),
}));
