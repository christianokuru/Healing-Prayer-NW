"""The minister's private notes, optionally linked to one person."""

import uuid

from sqlmodel import Session, col, select

from app import clock
from app.errors import AppError, ErrorCode
from app.models import Note, Person
from app.schemas import NoteInput, NotePublic


def _public(note: Note, person: Person | None) -> NotePublic:
    return NotePublic(
        id=note.id,
        body=note.body,
        person_id=note.person_id,
        person_name=person.full_name if person else None,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


def _check_person(session: Session, person_id: uuid.UUID | None) -> None:
    if person_id and session.get(Person, person_id) is None:
        raise AppError(ErrorCode.not_found, "We couldn't find that person.")


def _get(session: Session, note_id: uuid.UUID) -> Note:
    note = session.get(Note, note_id)
    if note is None:
        raise AppError(ErrorCode.not_found, "That note no longer exists.")
    return note


def _with_person(session: Session, note: Note) -> NotePublic:
    return _public(
        note, session.get(Person, note.person_id) if note.person_id else None
    )


def list_notes(
    session: Session, person_id: uuid.UUID | None = None
) -> list[NotePublic]:
    """Newest first; only one person's when `person_id` is given."""
    statement = (
        select(Note, Person)
        .outerjoin(Person, col(Person.id) == col(Note.person_id))
        .order_by(col(Note.created_at).desc(), col(Note.id))
    )
    if person_id:
        statement = statement.where(Note.person_id == person_id)
    return [_public(note, person) for note, person in session.exec(statement)]


def create(session: Session, data: NoteInput) -> NotePublic:
    _check_person(session, data.person_id)
    note = Note(body=data.body, person_id=data.person_id)
    session.add(note)
    session.commit()
    session.refresh(note)
    return _with_person(session, note)


def update(session: Session, note_id: uuid.UUID, data: NoteInput) -> NotePublic:
    note = _get(session, note_id)
    _check_person(session, data.person_id)
    note.body = data.body
    note.person_id = data.person_id
    note.updated_at = clock.utcnow()
    session.commit()
    session.refresh(note)
    return _with_person(session, note)


def delete(session: Session, note_id: uuid.UUID) -> None:
    session.delete(_get(session, note_id))
    session.commit()
