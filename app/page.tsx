import { redirect } from "next/navigation"

/**
 * The public site (home, about, etc.) is waiting on content from the client.
 * Until then the root sends people straight to log in.
 */
export default function RootPage() {
  redirect("/login")
}
