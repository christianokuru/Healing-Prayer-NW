"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { Note } from "@/lib/domain/types"

import { NoteEditor } from "./note-editor"
import { NoteItem } from "./note-item"

/** Notes about one person, shown on their history panel. */
export function PersonNotes({ personId, notes }: { personId: string; notes: Note[] }) {
  const [writing, setWriting] = useState(false)
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#3f524b]">Your notes</h3>
        <Button variant="ghost" size="sm" className="-mr-2" onClick={() => setWriting(true)}>
          <PlusIcon aria-hidden="true" /> Add note
        </Button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes about them yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} hidePerson />
          ))}
        </div>
      )}
      {writing && <NoteEditor open personId={personId} onOpenChange={(o) => !o && setWriting(false)} />}
    </section>
  )
}
