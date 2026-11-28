/** The private "manage my booking" page for a booking's token. */
export const managePath = (token: string) => `/manage/${encodeURIComponent(token)}`
