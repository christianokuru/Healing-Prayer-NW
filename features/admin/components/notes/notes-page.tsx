"use client"

import { NotebookPenIcon, PlusIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/feedback"
import { PageHeader } from "@/components/common/page-header"
import { Surface } from "@/components/common/surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useNotes } from "../../hooks"
import { NoteEditor } from "./note-editor"
import { NoteItem } from "./note-item"

/** The minister's notebook: dated notes, optionally about a person. */
export function NotesPage() {
  const notes = useNotes()
  const [query, setQuery] = useState("")
  const [writing, setWriting] = useState(false)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (notes.data ?? []).filter(
      (n) => !q || n.body.toLowerCase().includes(q) || n.personName?.toLowerCase().includes(q)
    )
  }, [notes.data, query])

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <PageHeader
        title="Notes"
        description="Things to remember, about the ministry or about someone. Only you can see them."
        actions={
          <Button onClick={() => setWriting(true)}>
            <PlusIcon aria-hidden="true" /> New note
          </Button>
        }
      />

      {notes.isError && <ErrorState error={notes.error} onRetry={() => notes.refetch()} />}
      {notes.isPending && <ListSkeleton rows={3} />}

      {notes.data && notes.data.length > 0 && (
        <div className="relative mb-4">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search notes"
            placeholder="Search notes or names"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {notes.data && notes.data.length === 0 && (
        <Surface>
          <EmptyState
            icon={NotebookPenIcon}
            title="No notes yet"
            description="Write down anything you want to remember, like a follow-up for someone or a practical reminder."
            action={
              <Button onClick={() => setWriting(true)}>
                <PlusIcon aria-hidden="true" /> Write the first note
              </Button>
            }
          />
        </Surface>
      )}

      {notes.data && notes.data.length > 0 && shown.length === 0 && (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-[15px] text-[#3f524b]">No notes match “{query}”.</p>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((n) => (
          <NoteItem key={n.id} note={n} />
        ))}
      </div>

      {writing && <NoteEditor open onOpenChange={(o) => !o && setWriting(false)} />}
    </div>
  )
}
