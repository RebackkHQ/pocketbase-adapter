import type {
  Adapter,
  AdapterAccount,
  AdapterAccountType,
  AdapterAuthenticator,
  AdapterSession,
  AdapterUser,
} from "@auth/core/adapters";
import type {
  CreateClientWithAuthOptions,
  CreateClientWithoutAuthOptions,
} from "./types/index.ts";
import Pocketbase from "pocketbase";

/**
 * Creates a Pocketbase adapter for NextAuth.
 * @param client - The Pocketbase client instance or options to create one.
 * @returns An adapter implementing the NextAuth Adapter interface.
 */
export function PocketbaseAdapter(
  optionsOrClient:
    | CreateClientWithAuthOptions
    | CreateClientWithoutAuthOptions
    | Pocketbase
): Adapter {
  if (optionsOrClient instanceof Pocketbase) {
    optionsOrClient = {
      client: optionsOrClient,
      requiresAuth: false,
    };
  }

  // Get the Pocketbase client instance
  const p = optionsOrClient.client;

  // Check if the client requires authentication
  if (optionsOrClient.requiresAuth) {
    const headers = optionsOrClient.headers;
    // Check if the client has headers for authentication
    if (!headers) {
      throw new Error("Missing headers for authenticated client");
    }

    // Add a beforeSend hook to include the required headers
    p.beforeSend = (url, option) => {
      option.headers = {
        ...option.headers,
        [headers.name]: headers.value,
      };

      return {
        url,
        option,
      };
    };
  }

  return {
    /**
     * Creates a new user in the Pocketbase collection.
     * @param id - The ID is ignored as Pocketbase generates it.
     * @param data - The user data to be stored.
     * @returns The created user object.
     */
    createUser: async ({ id, ...data }) => {
      const createdUser = await p.collection("users").create({
        user_email: data.email,
        user_email_verified: data.emailVerified?.toString(),
        user_image: data.image,
        user_name: data.name,
      });

      return {
        email: createdUser.user_email,
        emailVerified: new Date(createdUser.user_email_verified),
        id: createdUser.id,
        image: createdUser.user_image,
        name: createdUser.user_name,
      } satisfies AdapterUser;
    },

    /**
     * Retrieves a user by their ID.
     * @param id - The ID of the user.
     * @returns The user object.
     */
    getUser: (id) => {
      try {
        return p.collection("users").getOne(id);
      } catch (error) {
        return null;
      }
    },

    /**
     * Retrieves a user by their email address.
     * @param email - The email of the user.
     * @returns The user object or null if not found.
     */
    async getUserByEmail(email) {
      try {
        return await p
          .collection("users")
          .getFirstListItem(`user_email = "${email}"`);
      } catch (error) {
        return null;
      }
    },

    /**
     * Retrieves a user associated with a specific account.
     * @param provider_providerAccountId - The provider account ID.
     * @returns The user object.
     * @throws Error if the account is not found.
     */
    async getUserByAccount(providerProviderAccountId) {
      try {
        const account = await p.collection("accounts").getList(1, 1, {
          filter: `account_provider_account_id = "${providerProviderAccountId.providerAccountId}" && account_provider = "${providerProviderAccountId.provider}"`,
        });

        // Check if the account exists
        if (!account || !account.items || account.items.length === 0) {
          return null;
        }

        // Get the related user using the account_user_id
        const userId = account.items
          ? account.items[0]
            ? account.items[0].account_user_id
            : null
          : null;

        if (!userId) {
          return null;
        }

        const user = await p.collection("users").getOne(userId[0]);

        // Return the user details
        return {
          email: user.user_email,
          emailVerified: new Date(user.user_email_verified),
          id: user.id,
          image: user.user_image,
          name: user.user_name,
        } satisfies AdapterUser;
      } catch (error) {
        return null;
      }
    },

    /**
     * Updates an existing user in the Pocketbase collection.
     * @param id - The ID of the user to update.
     * @param data - The new user data.
     * @returns The updated user object.
     */
    async updateUser({ id, ...data }) {
      const updatedUser = await p.collection("users").update(id, {
        user_email: data.email,
        user_email_verified: data.emailVerified?.toString(),
        user_image: data.image,
        user_name: data.name,
      });

      return {
        email: updatedUser.user_email,
        emailVerified: new Date(updatedUser.user_email_verified),
        id: updatedUser.id,
        image: updatedUser.user_image,
        name: updatedUser.user_name,
      } satisfies AdapterUser;
    },

    /**
     * Deletes a user by their ID.
     * @param id - The ID of the user to delete.
     */
    deleteUser: async (id) => {
      try {
        const user = await p.collection("users").getOne(id);
        await p.collection("users").delete(user.id);

        return {
          email: user.user_email,
          emailVerified: new Date(user.user_email_verified),
          id: user.id,
          image: user.user_image,
          name: user.user_name,
        } satisfies AdapterUser;
      } catch (error) {
        return null;
      }
    },

    /**
     * Links an account to a user.
     * @param data - The account data to link.
     */
    linkAccount: async (data) => {
      await p.collection("accounts").create({
        account_provider_account_id: data.providerAccountId,
        account_provider_id: data.providerId,
        account_user_id: data.userId,
        account_type: data.type,
        account_provider: data.provider,
      });

      return {
        providerAccountId: data.providerAccountId,
        providerId: data.providerId,
        userId: data.userId,
        type: data.type,
        provider: data.provider,
      } satisfies AdapterAccount;
    },

    /**
     * Unlinks an account by its provider account ID.
     * @param provider_providerAccountId - The provider account ID.
     * @throws Error if the account is not found.
     */
    async unlinkAccount(providerProviderAccountId) {
      const account = await p
        .collection("accounts")
        .getFirstListItem(
          `account_provider_account_id = "${providerProviderAccountId.providerAccountId}" && account_provider = "${providerProviderAccountId.provider}"`
        );

      // Check if the account exists
      if (!account) {
        throw new Error("Account not found");
      }

      p.collection("accounts").delete(account.id);

      return {
        providerAccountId: account.account_provider_account_id,
        providerId: account.account_provider_id,
        userId: account.account_user_id[0],
        type: account.account_type,
        provider: account.account_provider,
      } satisfies AdapterAccount;
    },

    /**
     * Retrieves a session and the associated user by session token.
     * @param sessionToken - The session token.
     * @returns An object containing session and user details.
     * @throws Error if the session is not found.
     */
    getSessionAndUser: async (sessionToken) => {
      const session = await p
        .collection("sessions")
        .getFirstListItem(`session_session_token = "${sessionToken}"`);

      // Check if the session exists
      if (!session) {
        return null;
      }

      // Get the related user using the session_user_id
      const userId = session.session_user_id;
      const user = await p.collection("users").getOne(userId[0]);

      // Return both the session and user details
      return {
        session: {
          sessionToken: session.session_session_token,
          userId: session.session_user_id[0],
          expires: new Date(session.session_expires),
        } satisfies AdapterSession,
        user: {
          email: user.user_email,
          emailVerified: new Date(user.user_email_verified),
          id: user.id,
          image: user.user_image,
          name: user.user_name,
        } satisfies AdapterUser,
      };
    },

    /**
     * Creates a new session for a user.
     * @param data - The session data to create.
     * @returns The created session object.
     */
    createSession: async (data) => {
      const session = await p.collection("sessions").create({
        session_expires: data.expires,
        session_session_token: data.sessionToken,
        session_user_id: data.userId,
      });

      return {
        sessionToken: session.session_session_token,
        userId: data.userId,
        expires: new Date(session.session_expires),
      } satisfies AdapterSession;
    },

    /**
     * Updates an existing session.
     * @param sessionToken - The current session token.
     * @param data - The new session data.
     * @returns The updated session object.
     * @throws Error if the session is not found.
     */
    updateSession: async ({ sessionToken, ...data }) => {
      const session = await p
        .collection("sessions")
        .getFirstListItem(`session_session_token = "${sessionToken}"`);

      // Check if the session exists
      if (!session) {
        return null;
      }

      // Update the session with new data
      const updatedSession = await p.collection("sessions").update(session.id, {
        session_expires: data.expires,
        session_session_token: sessionToken,
        session_user_id: data.userId,
      });

      // Return the updated session
      return {
        sessionToken: updatedSession.session_session_token,
        userId: updatedSession.session_user_id[0],
        expires: new Date(updatedSession.session_expires),
      } satisfies AdapterSession;
    },

    /**
     * Deletes a session by its token.
     * @param sessionToken - The session token to delete.
     * @throws Error if the session is not found.
     */
    deleteSession: async (sessionToken) => {
      const session = await p
        .collection("sessions")
        .getFirstListItem(`session_session_token = "${sessionToken}"`);

      // Check if the session exists
      if (!session) {
        return null;
      }

      p.collection("sessions").delete(session.id);
      return {
        sessionToken: session.session_session_token,
        userId: session.session_user_id[0],
        expires: new Date(session.session_expires),
      } satisfies AdapterSession;
    },

    /**
     * Creates a new verification token.
     * @param identifier - The identifier for the token (e.g., email).
     * @param token - The actual token string.
     * @param expires - The expiration date of the token.
     * @returns The created verification token object.
     */
    async createVerificationToken({ identifier, token, expires }) {
      // Create a new verification token entry in the Pocketbase collection
      try {
        const verificationToken = await p
          .collection("verification_tokens")
          .create({
            verification_identifier: identifier,
            verification_token: token,
            verification_expires: expires.toISOString(), // Make sure expires is a valid date string
          });

        // Return the created token data
        return {
          identifier: verificationToken.verification_identifier,
          token: verificationToken.verification_token,
          expires: new Date(verificationToken.verification_expires),
        };
      } catch (error) {
        return null;
      }
    },

    /**
     * Uses a verification token to validate it and delete it afterward.
     * @param identifier_token - The identifier for the token.
     * @returns The valid verification token or null if invalid or expired.
     */
    async useVerificationToken(identifierToken) {
      try {
        // Fetch the verification token using the identifier_token
        const verificationToken = await p
          .collection("verification_tokens")
          .getFirstListItem(
            `verification_identifier = "${identifierToken.identifier}" && verification_token = "${identifierToken.token}"`
          );

        // Check if the verification token exists
        if (!verificationToken) {
          return null; // Token not found, return null
        }

        // Check if the token has expired
        const now = new Date();
        const expires = new Date(verificationToken.verification_expires);
        if (now > expires) {
          return null; // Token has expired, return null
        }

        // Delete the token after using it
        await p.collection("verification_tokens").delete(verificationToken.id);

        // Return the valid verification token details without the ID
        const { id, ...validToken } = verificationToken; // Destructure to remove ID
        return {
          identifier: validToken.verification_identifier,
          token: validToken.verification_token,
          expires: new Date(validToken.verification_expires),
        };
      } catch (_error) {
        return null; // Return null in case of any other error
      }
    },

    /**
     * Retrieves an account by its provider account ID and provider.
     * @param providerAccountId - The provider account ID.
     * @param provider - The provider name.
     * @returns The account details.
     * @throws Error if the account is not found.
     */
    async getAccount(providerAccountId, provider) {
      const account = await p
        .collection("accounts")
        .getFirstListItem(
          `account_provider_account_id = "${providerAccountId}" && account_provider = "${provider}"`
        );

      // Check if the account exists
      if (!account) {
        return null;
      }

      // Return the account details
      return {
        userId: account.account_user_id[0],
        providerId: account.account_provider,
        providerAccountId: account.account_provider_account_id,
        type: account.account_type as AdapterAccountType,
        provider: account.account_provider,
      } satisfies AdapterAccount;
    },

    /**
     * Creates a new authenticator for a user.
     * @param authenticator - The authenticator data.
     * @returns The created authenticator object.
     */
    async createAuthenticator(authenticator) {
      const newAuthenticator = await p.collection("authenticators").create({
        authenticator_credential_id: authenticator.credentialID,
        authenticator_user_id: authenticator.userId, // Ensure this is an array if required by your schema
        authenticator_provider_account_id: authenticator.providerAccountId,
        authenticator_credential_public_key: authenticator.credentialPublicKey,
        authenticator_counter: authenticator.counter,
        authenticator_credential_device_type:
          authenticator.credentialDeviceType,
        authenticator_credential_backed_up: authenticator.credentialBackedUp,
        authenticator_transports: authenticator.transports,
      });

      return {
        credentialID: newAuthenticator.authenticator_credential_id,
        userId: newAuthenticator.authenticator_user_id[0],
        providerAccountId: newAuthenticator.authenticator_provider_account_id,
        credentialPublicKey:
          newAuthenticator.authenticator_credential_public_key,
        counter: newAuthenticator.authenticator_counter,
        credentialDeviceType:
          newAuthenticator.authenticator_credential_device_type,
        credentialBackedUp: newAuthenticator.authenticator_credential_backed_up,
        transports: newAuthenticator.authenticator_transports,
      } satisfies AdapterAuthenticator;
    },

    /**
     * Retrieves an authenticator by its credential ID.
     * @param credentialID - The ID of the authenticator.
     * @returns The authenticator object.
     * @throws Error if the authenticator is not found.
     */
    async getAuthenticator(credentialId) {
      const authenticator = await p
        .collection("authenticators")
        .getFirstListItem(`authenticator_credential_id = "${credentialId}"`);

      // Check if the authenticator exists
      if (!authenticator) {
        return null;
      }

      // Return the authenticator details
      return {
        credentialID: authenticator.id,
        userId: authenticator.authenticator_user_id[0],
        providerAccountId: authenticator.authenticator_provider_account_id,
        credentialPublicKey: authenticator.authenticator_credential_public_key,
        counter: authenticator.authenticator_counter,
        credentialDeviceType:
          authenticator.authenticator_credential_device_type,
        credentialBackedUp: authenticator.authenticator_credential_backed_up,
        transports: authenticator.authenticator_transports,
      } satisfies AdapterAuthenticator;
    },

    /**
     * Lists authenticators associated with a user ID.
     * @param userId - The user ID to filter authenticators.
     * @returns An array of authenticator objects.
     */
    async listAuthenticatorsByUserId(userId) {
      const authenticators = await p
        .collection("authenticators")
        .getFullList(200, {
          filter: `authenticator_user_id = "${userId}"`,
        });

      // Return the list of authenticators
      return authenticators.map(
        (authenticator) =>
          ({
            credentialID: authenticator.id,
            providerAccountId: authenticator.authenticator_provider_account_id,
            credentialPublicKey:
              authenticator.authenticator_credential_public_key,
            counter: authenticator.authenticator_counter,
            credentialDeviceType:
              authenticator.authenticator_credential_device_type,
            credentialBackedUp:
              authenticator.authenticator_credential_backed_up,
            transports: authenticator.authenticator_transports,
            userId: authenticator.authenticator_user_id[0],
          } satisfies AdapterAuthenticator)
      );
    },

    /**
     * Updates the counter for an authenticator.
     * @param credentialID - The ID of the authenticator to update.
     * @param counter - The new counter value.
     * @returns The updated authenticator object.
     * @throws Error if the authenticator is not found.
     */
    async updateAuthenticatorCounter(credentialId, counter) {
      const authenticator = await p
        .collection("authenticators")
        .getFirstListItem(`authenticator_credential_id = "${credentialId}"`);

      // Check if the authenticator exists
      if (!authenticator) {
        throw new Error("Authenticator not found");
      }

      // Update the authenticator counter
      const updatedAuthenticator = await p
        .collection("authenticators")
        .update(authenticator.id, {
          authenticator_counter: counter,
        });

      // Return the updated authenticator details
      return {
        credentialID: updatedAuthenticator.id,
        userId: updatedAuthenticator.authenticator_user_id[0],
        providerAccountId:
          updatedAuthenticator.authenticator_provider_account_id,
        credentialPublicKey:
          updatedAuthenticator.authenticator_credential_public_key,
        counter: updatedAuthenticator.authenticator_counter,
        credentialDeviceType:
          updatedAuthenticator.authenticator_credential_device_type,
        credentialBackedUp:
          updatedAuthenticator.authenticator_credential_backed_up,
        transports: updatedAuthenticator.authenticator_transports,
      } satisfies AdapterAuthenticator;
    },
  };
}

export {
  CreateClientWithAuthOptions,
  CreateClientWithoutAuthOptions,
  BaseCreateClientOptions,
} from "./types/index.ts";
