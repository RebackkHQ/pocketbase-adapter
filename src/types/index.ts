import type Pocketbase from "pocketbase";

/**
 * Base options for creating a Pocketbase client.
 */
export interface BaseCreateClientOptions<T = boolean> {
  client: Pocketbase; // The Pocketbase client instance.
  requiresAuth: T; // Indicates if authentication is required.
}

/**
 * Options for creating a Pocketbase client with authentication.
 */
export interface CreateClientWithAuthOptions
  extends BaseCreateClientOptions<true> {
  headers: {
    name: string; // The key for the authentication header.
    value: string; // The value for the authentication header.
  };
}

/**
 * Options for creating a Pocketbase client without authentication.
 */
export interface CreateClientWithoutAuthOptions
  extends BaseCreateClientOptions<false> {}
