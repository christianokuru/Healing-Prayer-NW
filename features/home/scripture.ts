/**
 * Scripture used on the home page, from the King James Version (public domain).
 * Change or add verses here; every section reads from this file.
 */
export interface Scripture {
  text: string
  reference: string
}

const KJV = (text: string, reference: string): Scripture => ({ text, reference })

export const SCRIPTURE = {
  welcome: KJV(
    "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    "Matthew 11:28"
  ),
  brokenHearted: KJV("He healeth the broken in heart, and bindeth up their wounds.", "Psalm 147:3"),
  prayOneForAnother: KJV("Pray one for another, that ye may be healed.", "James 5:16"),
  fearNot: KJV(
    "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee.",
    "Isaiah 41:10"
  ),
  restore: KJV("For I will restore health unto thee, and I will heal thee of thy wounds, saith the LORD.", "Jeremiah 30:17"),
  near: KJV("The LORD is nigh unto them that are of a broken heart.", "Psalm 34:18"),
  shepherd: KJV("The LORD is my shepherd; I shall not want. He restoreth my soul.", "Psalm 23:1, 3"),
} as const

export const TRANSLATION = "KJV"
