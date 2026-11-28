"use client"

import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api/errors"
import { LIMITS } from "@/lib/config/ministry"
import type { Note } from "@/lib/domain/types"

import { useCreateNote, usePeople, useUpdateNote } from "../../hooks"

interface NoteEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Editing an existing note; otherwise a new one. */
  note?: Note
  /** Fix the note to one person (from their history panel). */
  personId?: string
}

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

/** Write or edit a note, optionally about one person. */
export function NoteEditor({ open, onOpenChange, note, personId: fixedPerson }: NoteEditorProps) {
  const people = usePeople()
  const create = useCreateNote()
  const update = useUpdateNote()
  const [body, setBody] = useState(note?.body ?? "")
  const [personId, setPersonId] = useState(fixedPerson ?? note?.personId ?? "")
  const pending = create.isPending || update.isPending

  const save = () => {
    const input = { body: body.trim(), personId: personId || null }
    const request = note ? update.mutateAsync({ noteId: note.id, ...input }) : create.mutateAsync(input)
    return request.then(
      () => {
        onOpenChange(false)
        toast.success(note ? "Note updated." : "Note saved.")
      },
      (e) => toast.error(errorMessage(e))
    )
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={note ? "Edit note" : "New note"}
      description="Private to the prayer ministry. Visitors never see notes."
      confirmLabel={note ? "Save changes" : "Save note"}
      cancelLabel="Cancel"
      pending={pending}
      confirmDisabled={!body.trim()}
      onConfirm={save}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note-body" className="text-[15px] font-semibold">
            Note
          </Label>
          <Textarea
            id="note-body"
            value={body}
            maxLength={LIMITS.noteMax}
            rows={7}
            className="min-h-44"
            placeholder="Anything you want to remember."
            autoFocus
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {!fixedPerson && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-person" className="text-[15px] font-semibold">
              About someone? <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <select
              id="note-person"
              className={selectClass}
              value={personId}
              disabled={!people.data}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">Nobody in particular</option>
              {people.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.email})
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">Linked notes also show on that person&apos;s history.</p>
          </div>
        )}
      </div>
    </ConfirmDialog>
  )
}
