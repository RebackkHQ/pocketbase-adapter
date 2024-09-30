import { equal } from "node:assert/strict"; // Importing strict assertion methods from Node.js to compare values.
import { after, afterEach, beforeEach, describe, it } from "node:test"; // Importing test helpers to structure the test cases.
import type {
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "@auth/core/adapters"; // Importing types from the adapter.
import Pocketbase from "pocketbase"; // Importing Pocketbase client.
import { PocketbaseAdapter } from "../index.ts"; // Importing the PocketbaseAdapter that is being tested.
import { throws } from "node:assert";

describe("PocketbaseAdapter", async () => {
  const client: Pocketbase = new Pocketbase("http://localhost:8090");
  let testUserId = "test-user";

  const adapter = PocketbaseAdapter({
    client,
    requiresAuth: true,
    headers: {
      name: "x_access_key",
      value: "test",
    },
  });

  it("should return status 200", async () => {
    const health = await client.health.check();
    equal(health.code, 200);
  });

  it("should throw an error if headers are not set", async () => {
    throws(() => {
      // biome-ignore lint/suspicious/noExplicitAny : test case
      PocketbaseAdapter({ client, requiresAuth: true } as any);
    }, new Error("Missing headers for authenticated client"));
  });

  it("should return an instance of PocketbaseAdapter", async () => {
    const adapterFunctions = [
      "createUser",
      "getUser",
      "getUserByEmail",
      "getUserByAccount",
      "updateUser",
      "deleteUser",
      "linkAccount",
      "unlinkAccount",
      "getSessionAndUser",
      "createSession",
      "updateSession",
      "deleteSession",
      "createVerificationToken",
      "useVerificationToken",
      "getAccount",
    ];

    for (const func of adapterFunctions) {
      // @ts-ignore
      equal(typeof adapter[func], "function");
    }
  });
  // Describe block for user management-related tests
  describe("User Management", () => {
    it("should create a new user", async () => {
      const mockUser = {
        email: "test@example.com",
        emailVerified: new Date(),
        id: "test", // Initial ID, but will be overridden after creation
        image: "https://example.com/image.jpg",
        name: "Test User",
      } satisfies AdapterUser;

      // Attempt to create the user using the adapter
      const createdUser = (await adapter.createUser?.(mockUser)) || null;

      // Error handling if the user creation fails
      if (!createdUser) {
        throw new Error("User not created");
      }

      // Save the created user ID for future tests
      testUserId = createdUser.id; // Update testUserId to the created user's ID

      // Assert that the created user's email matches the mock data
      equal(createdUser.email, mockUser.email);
    });

    it("should get a user by id", async () => {
      // Attempt to retrieve the user by their ID
      const user = (await adapter.getUser?.(testUserId)) || null;

      // Error handling if the user is not found
      if (!user) {
        throw new Error("User not found");
      }

      // Assert that the retrieved user's ID matches the test user ID
      equal(user.id, testUserId);
    });

    it("should get a user by email", async () => {
      // Attempt to retrieve the user by their email
      const user = (await adapter.getUserByEmail?.("test@example.com")) || null;

      // Error handling if the user is not found
      if (!user) {
        throw new Error("User not found");
      }

      // Assert that the retrieved user's ID matches the test user ID
      equal(user.id, testUserId);
    });

    it("should update a user", async () => {
      // Define updated user data matching the AdapterUser type
      const mockUser = {
        email: "test@example.com",
        emailVerified: new Date(),
        id: testUserId,
        image: "https://example.com/image.jpg",
        name: "Test User",
      } satisfies AdapterUser;

      // Attempt to update the user using the adapter
      const updatedUser = (await adapter.updateUser?.(mockUser)) || null;

      // Error handling if the user update fails
      if (!updatedUser) {
        throw new Error("User not updated");
      }

      // Assert that the updated user's email matches the new mock data
      equal(updatedUser.email, mockUser.email);
    });
  });

  // Describe block for account management-related tests
  describe("Account Management", () => {
    it("should link an account", async () => {
      // Define mock account data that satisfies AdapterAccount
      const mockAccount = {
        providerAccountId: "test-provider-account",
        providerId: "test-provider",
        userId: testUserId,
        type: "email",
        provider: "email",
      } satisfies AdapterAccount;

      // Attempt to link the account using the adapter
      const linkedAccount = (await adapter.linkAccount?.(mockAccount)) || null;

      // Error handling if the account is not linked
      if (!linkedAccount) {
        throw new Error("Account not linked");
      }

      // Assert that the linked account's providerAccountId matches the mock data
      equal(linkedAccount.providerAccountId, mockAccount.providerAccountId);
    });

    it("should get a user by provider account id", async () => {
      const providerAccountId = "test-provider-account";
      const provider = "email";

      // Attempt to retrieve a user using the provider and providerAccountId
      const user =
        (await adapter.getUserByAccount?.({
          providerAccountId,
          provider,
        })) || null;

      // Error handling if no user is found
      if (!user) {
        throw new Error("User not found");
      }

      // Assert that the retrieved user's ID matches the test user ID
      equal(user.id, testUserId);
    });

    it("Should unlink an account", async () => {
      // Define mock account data
      const mockAccount = {
        providerAccountId: "test-provider-account",
        providerId: "test-provider",
        userId: testUserId,
        type: "email",
        provider: "email",
      } satisfies AdapterAccount;

      // Attempt to unlink the account using the adapter
      const unlinkedAccount =
        (await adapter.unlinkAccount?.({
          provider: mockAccount.provider,
          providerAccountId: mockAccount.providerAccountId,
        })) || null;

      // Error handling if the account is not unlinked
      if (!unlinkedAccount) {
        throw new Error("Account not unlinked");
      }

      // Assert that the unlinked account's providerAccountId matches the mock data
      equal(unlinkedAccount.providerAccountId, mockAccount.providerAccountId);
    });
  });

  // Describe block for session management-related tests
  describe("Session Management", () => {
    it("should create a new session", async () => {
      // Define mock session data that satisfies AdapterSession
      const mockSession = {
        sessionToken: "mock_session_token",
        userId: testUserId,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      } satisfies AdapterSession;

      // Attempt to create the session
      (await adapter.createSession?.(mockSession)) || null;

      // Error handling if the session is not created
      if (!mockSession) {
        throw new Error("Session not created");
      }

      // Assert that the session's token matches the mock data
      equal(mockSession.sessionToken, "mock_session_token");
    });

    it("should update a session", async () => {
      // Define updated session data
      const mockSession = {
        sessionToken: "mock_session_token",
        userId: testUserId,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 48),
      } satisfies AdapterSession;

      // Attempt to update the session using the adapter
      const session = (await adapter.updateSession?.(mockSession)) || null;

      // Error handling if the session is not updated
      if (!session) {
        throw new Error("Session not found");
      }

      // Assert that the session's token matches the mock data
      equal(session.sessionToken, "mock_session_token");
    });

    it("Should get a session and user by token", async () => {
      const sessionToken = "mock_session_token";

      // Attempt to retrieve the session and user by session token
      const session = (await adapter.getSessionAndUser?.(sessionToken)) || null;

      // Error handling if no session is found
      if (!session) {
        throw new Error("Session not found");
      }

      // Assert that the session's token and user ID match the mock data
      equal(session.session.sessionToken, sessionToken);
      equal(session.user.id, testUserId);
    });

    it("Should delete a session", async () => {
      const sessionToken = "mock_session_token";

      // Attempt to delete the session using the adapter
      const session = (await adapter.deleteSession?.(sessionToken)) || null;

      // Error handling if the session is not deleted
      if (!session) {
        throw new Error("Session not found");
      }

      // Assert that the deleted session's token matches the mock data
      equal(session.sessionToken, sessionToken);
    });
  });

  // Describe block for verification token management-related tests
  describe("Verification Management", () => {
    it("Should Create A Verification", async () => {
      // Define mock verification token data that satisfies VerificationToken
      const mockVerification = {
        identifier: "mock_identifier",
        token: "mock_token",
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      } as VerificationToken;

      // Attempt to create the verification token
      const verification =
        (await adapter.createVerificationToken?.(mockVerification)) || null;

      // Error handling if the verification token is not created
      if (!verification) {
        throw new Error("Verification not created");
      }

      // Assert that the verification token matches the mock data
      equal(verification.token, "mock_token");
    });

    it("Should Get A Verification", async () => {
      const identifier = "mock_identifier";
      const token = "mock_token";

      // Attempt to retrieve the verification token using identifier and token
      const verification =
        (await adapter.useVerificationToken?.({
          identifier,
          token,
        })) || null;

      // Error handling if the verification token is not found
      if (!verification) {
        throw new Error("Verification not found");
      }

      // Assert that the retrieved verification token matches the mock data
      equal(verification.token, token);
    });
  });
});
