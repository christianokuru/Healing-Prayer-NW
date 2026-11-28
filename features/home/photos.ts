/**
 * Photos on the home page. All free under the Unsplash License
 * (https://unsplash.com/license): no fee, no permission and no credit needed.
 * The photographer and page are kept here for reference.
 */
export interface Photo {
  src: string
  alt: string
  photographer: string
  /** The photo's page on Unsplash. */
  url: string
}

const unsplash = (id: string) => `https://images.unsplash.com/${id}`

export const PHOTOS = {
  hero: {
    src: unsplash("photo-1552838671-4c793a745d03"),
    alt: "Morning sunlight streaming across a green field",
    photographer: "Sara Kurfeß",
    url: "https://unsplash.com/photos/sun-rays-on-green-grass-field-ltE8bDLjX9E",
  },
  comfort: {
    src: unsplash("photo-1520857014576-2c4f4c972b57"),
    alt: "Women praying together, one resting a hand gently on another's shoulder",
    photographer: "Rosie Sun",
    url: "https://unsplash.com/photos/four-women-looking-down-rTwhmFSoXC8",
  },
  prayingHands: {
    src: unsplash("photo-1645620549807-0aea79c18482"),
    alt: "Two people's hands clasped in prayer over an open Bible",
    photographer: "Tony Lomas",
    url: "https://unsplash.com/photos/two-people-holding-hands-over-a-book-on-a-table-iIzZ0Fw8wSQ",
  },
  morningReading: {
    src: unsplash("photo-1533000971552-6a962ff0b9f9"),
    alt: "An open Bible on a wooden dock by still water at sunrise",
    photographer: "Aaron Burden",
    url: "https://unsplash.com/photos/book-on-top-of-table-and-body-of-water-535Npq1wFG8",
  },
} satisfies Record<string, Photo>
