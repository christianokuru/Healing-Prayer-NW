"use client"

import { PencilIcon, Trash2Icon, UserRoundIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api/errors"
import { fmt } from "@/lib/domain/time"
import type { Note } from "@/lib/domain/types"

import { useDeleteNote } from "../../hooks"
import { NoteEditor } from "./note-editor"

interface NoteItemProps {
  note: Note
  /** Hide the person link (already on their page). */
  hidePerson?: boolean
}

export function NoteItem({ note, hidePerson }: NoteItemProps) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null)
  const remove = useDeleteNote()
  const edited = note.updatedAt !== note.createdAt

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        <time dateTime={note.createdAt}>{fmt.dayMonthYear(note.createdAt)}</time>
        {edited && <span>· edited</span>}
        {!hidePerson && note.personId && note.personName && (
          <Link
            href={`/admin/history?person=${note.personId}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 font-semibold text-primary-strong hover:underline"
          >
            <UserRoundIcon className="size-3" aria-hidden="true" />
            {note.personName}
          </Link>
        )}
      </div>
      <p className="mt-2 text-base leading-relaxed whitespace-pre-line text-[#26392f]">{note.body}</p>
      <div className="mt-3 flex gap-1">
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setDialog("edit")}>
          <PencilIcon aria-hidden="true" /> Edit
        </Button>
        <Button variant="ghost" size="sm" className="text-danger-foreground" onClick={() => setDialog("delete")}>
          <Trash2Icon aria-hidden="true" /> Delete
        </Button>
      </div>

      {dialog === "edit" && (
        <NoteEditor open note={note} personId={hidePerson ? note.personId : undefined} onOpenChange={(o) => !o && setDialog(null)} />
      )}
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        tone="danger"
        title="Delete this note?"
        description="It will be removed for good. This can't be undone."
        confirmLabel="Delete note"
        cancelLabel="Keep it"
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutateAsync(note.id).then(
            () => {
              setDialog(null)
              toast.success("Note deleted.")
            },
            (e) => toast.error(errorMessage(e))
          )
        }
      />
    </article>
  )
}
