from datetime import UTC, datetime, timedelta

from app.schedule import slots_on
from app.worker import queue_digest, queue_reminders, run_jobs, send_next
from tests.conftest import (
    DEC_3,
    DEC_10,
    NOV_26,
    approve,
    book,
    booked,
    check_error,
    confirmed,
    mails,
    slot,
    status_of,
    subjects,
)

GRACE = "grace@example.com"


def act(admin, booking, action):
    return admin.post(f"/admin/bookings/{booking}/{action}", json={})


def attend(admin, booking, attendance):
    return admin.put(
        f"/admin/bookings/{booking}/attendance", json={"attendance": attendance}
    )


def test_approve_online_needs_zoom(grace, admin, db):
    booking = booked(grace, online=True, onlineReason="Far away")
    check_error(approve(admin, booking), 422, "validation")
    check_error(approve(admin, booking, zoomLink="javascript:x"), 422, "validation")
    link = "https://zoom.us/j/123?pwd=a"
    body = approve(admin, booking, zoomLink=link).json()
    assert (body["status"], body["zoomLink"]) == ("confirmed", link)
    assert body["visitor"]["email"] == GRACE
    assert body["visitCount"] == 0
    mail = mails(db, GRACE)[-1]
    assert link in mail.body
    assert "7:00 pm (Calgary time)" in mail.body
    assert mail.ics and "BEGIN:VEVENT" in mail.ics
    check_error(approve(admin, booking, zoomLink=link), 409, "invalid_state")
    check_error(approve(admin, "nope"), 404, "not_found")


def test_past_requests_cannot_be_answered(grace, admin, time):
    booking = booked(grace)
    time.to(slots_on(DEC_3)[0])
    check_error(approve(admin, booking), 409, "invalid_state")
    check_error(act(admin, booking, "decline"), 409, "invalid_state")
    assert status_of(grace, booking) == "pending"


def test_undo_withdraws_the_email(grace, admin, db, time):
    booking = confirmed(grace, admin)
    while send_next(db):
        pass
    assert "Your prayer session is confirmed" in subjects(db, GRACE)
    assert act(admin, booking, "revert").json()["status"] == "pending"
    assert "Your prayer session is confirmed" not in subjects(db, GRACE)
    approve(admin, booking)
    time.forward(seconds=11)
    while send_next(db):
        pass
    sent = mails(db, GRACE)[-1]
    assert sent.sent_at and sent.body == "" and sent.ics is None


def test_decline_and_revert(grace, tom, admin, db):
    booking = booked(grace)
    url = f"/admin/bookings/{booking}/decline"
    check_error(admin.post(url, json={"message": "x" * 301}), 422, "validation")
    body = admin.post(url, json={"message": "I'm away"}).json()
    assert (body["status"], body["declineMessage"]) == ("declined", "I'm away")
    assert "I'm away" in mails(db, GRACE)[-1].body
    body = act(admin, booking, "revert").json()
    assert (body["status"], body["declineMessage"]) == ("pending", None)
    act(admin, booking, "decline")
    booked(tom)  # takes the freed slot
    check_error(act(admin, booking, "revert"), 409, "invalid_state")


def test_attendance(grace, tom, admin, db, time):
    booking = confirmed(grace, admin)
    request = booked(tom, index=1)
    # Not before the session starts.
    check_error(attend(admin, booking, "attended"), 409, "invalid_state")
    time.to(slots_on(DEC_3)[0])
    # Only approved sessions.
    check_error(attend(admin, request, "attended"), 409, "invalid_state")
    check_error(attend(admin, booking, "maybe"), 422, "validation")

    before = subjects(db, GRACE)
    assert attend(admin, booking, "attended").json()["status"] == "attended"
    assert attend(admin, booking, "attended").json()["status"] == "attended"
    assert attend(admin, booking, "no_show").json()["status"] == "no_show"
    assert attend(admin, booking, None).json()["status"] == "confirmed"
    # Marking attendance never emails anyone: the minister writes herself.
    assert subjects(db, GRACE) == before


def follow_up(admin, booking, **body):
    payload = {"subject": "We missed you on Thursday", "message": "Hello Grace,"}
    return admin.post(f"/admin/bookings/{booking}/follow-up", json=payload | body)


def test_follow_up_email(grace, admin, db, time):
    booking = confirmed(grace, admin)
    time.to(slots_on(DEC_3)[0])
    # Only for people marked as didn't come.
    check_error(follow_up(admin, booking), 409, "invalid_state")
    attend(admin, booking, "no_show")
    for bad in ({"subject": " "}, {"message": "x" * 2001}, {"subject": "a\nBcc: x"}):
        check_error(follow_up(admin, booking, **bad), 422, "validation")
    body = follow_up(
        admin, booking, message="Hello Grace,\n\nIs everything all right?"
    ).json()
    assert body["followUpSentAt"] == "2026-12-04T01:00:00.000Z"
    mail = mails(db, GRACE)[-1]
    assert mail.subject == "We missed you on Thursday"
    assert "Is everything all right?" in mail.body
    # She may write again; each one is sent.
    follow_up(admin, booking, subject="Thinking of you")
    assert subjects(db, GRACE)[-2:] == ["We missed you on Thursday", "Thinking of you"]
    check_error(follow_up(admin, "nope"), 404, "not_found")


def test_block_thursday(grace, tom, admin, db):
    first, second = confirmed(grace, admin), booked(tom, index=1)
    check_error(
        admin.post("/admin/blocked-dates", json={"date": "2026-12-04"}),
        422,
        "validation",
    )
    body = {"date": str(DEC_3), "reason": "Travelling"}
    response = admin.post("/admin/blocked-dates", json=body)
    assert response.status_code == 201
    assert response.json()["affected"] == 2
    assert response.json()["blocked"] == body | {
        "createdAt": "2026-11-23T17:00:00.000Z"
    }
    assert admin.get("/admin/blocked-dates").json() == [response.json()["blocked"]]
    assert status_of(grace, first) == "cancelled_by_minister"
    assert status_of(tom, second) == "cancelled_by_minister"
    # The withdrawn confirmation is replaced by the cancellation, without the reason.
    assert subjects(db, GRACE)[-1] == "Your prayer session was cancelled"
    assert "Your prayer session is confirmed" not in subjects(db, GRACE)
    assert all("Travelling" not in m.body for m in mails(db, GRACE))
    check_error(admin.post("/admin/blocked-dates", json=body), 409, "invalid_state")
    check_error(book(grace), 409, "date_unavailable")
    url = f"/admin/blocked-dates/{DEC_3}"
    assert admin.delete(url).status_code == 204
    check_error(admin.delete(url), 404, "not_found")
    assert status_of(grace, first) == "cancelled_by_minister"
    assert book(grace).status_code == 201


def test_lists_people_and_analytics(grace, tom, admin, time):
    online = booked(grace, DEC_3, online=True, onlineReason="Far")
    approve(admin, online, zoomLink="https://zoom.us/j/1")
    missed = confirmed(tom, admin, DEC_3, 1)
    first = confirmed(grace, admin, NOV_26)
    later = confirmed(grace, admin, DEC_10)
    admin.post("/admin/blocked-dates", json={"date": "2026-12-24"})
    time.to(slots_on(DEC_3)[3] + timedelta(hours=1))
    attend(admin, missed, "no_show")

    # Sessions only count as held once marked as attended.
    stats = admin.get("/admin/analytics", params={"months": 3}).json()
    assert stats["sessionsHeld"] == 0 and stats["unmarked"] == 2
    attend(admin, first, "attended")
    attend(admin, online, "attended")

    everything = admin.get("/admin/bookings").json()
    assert [b["slotStart"] for b in everything] == sorted(
        b["slotStart"] for b in everything
    )
    assert next(b for b in everything if b["id"] == later)["visitCount"] == 2
    ranged = admin.get(
        "/admin/bookings", params={"from": slot(DEC_3), "to": slot(DEC_10)}
    ).json()
    assert len(ranged) == 2

    people = admin.get("/admin/people").json()
    assert [p["fullName"] for p in people] == ["Grace", "Tom"]
    assert people[0]["completedCount"] == 2
    assert people[0]["firstVisit"] == slot(NOV_26)
    assert people[0]["lastVisit"] == slot(DEC_3)
    assert people[1]["noShowCount"] == 1
    assert people[1]["firstVisit"] is None

    detail = admin.get(f"/admin/people/{people[0]['id']}").json()
    assert detail["bookings"][0]["id"] == later
    assert detail["notes"] == []
    check_error(admin.get("/admin/people/nope"), 404, "not_found")
    me = admin.get("/auth/me").json()["id"]
    check_error(admin.get(f"/admin/people/{me}"), 404, "not_found")

    stats = admin.get("/admin/analytics", params={"months": 3}).json()
    assert stats["rangeLabel"] == "October – December 2026"
    assert stats["sessionsHeld"] == 2 and stats["thursdaysHeld"] == 2
    assert stats["peoplePrayedFor"] == 1 and stats["returningPeople"] == 1
    assert stats["noShows"] == 1 and stats["attendanceRate"] == 67
    assert stats["unmarked"] == 0
    assert stats["onlineSessions"] == 1
    assert stats["monthly"] == [
        {"month": "2026-10", "label": "Oct", "held": 0, "capacity": 20},
        {"month": "2026-11", "label": "Nov", "held": 1, "capacity": 16},
        {"month": "2026-12", "label": "Dec", "held": 1, "capacity": 16},
    ]
    assert [p["fullName"] for p in stats["frequent"]] == ["Grace"]
    bad = admin.get("/admin/analytics", params={"months": 4})
    check_error(bad, 422, "validation")


def test_analytics_empty(admin):
    stats = admin.get("/admin/analytics", params={"months": 12}).json()
    assert stats["attendanceRate"] == 0
    assert stats["rangeLabel"] == "December 2025 – November 2026"


def test_daily_jobs_run_once(grace, tom, admin, db, time):
    confirmed(grace, admin)
    booked(tom, index=1)
    time.to(datetime(2026, 12, 2, 17, tzinfo=UTC))  # 11 am, the day before
    for _ in range(3):
        run_jobs(db)
    assert subjects(db, GRACE).count("Your prayer session is tomorrow") == 1
    assert "Your prayer session is tomorrow" not in subjects(db, "tom@example.com")
    digests = [m for m in mails(db, "janis@example.com") if "waiting" in m.subject]
    assert len(digests) == 1
    assert "Tom" in digests[0].body and "SECRET-POINTS" not in digests[0].body


def test_daily_jobs_keep_office_hours(grace, admin, db, time):
    confirmed(grace, admin)
    time.to(datetime(2026, 12, 2, 8, tzinfo=UTC))  # 2 am
    before = len(mails(db, GRACE))
    queue_reminders(db)
    queue_digest(db)
    assert len(mails(db, GRACE)) == before


def test_failed_email_is_retried(grace, db, time, monkeypatch):
    booked(grace)

    def fail(_):
        raise OSError

    monkeypatch.setattr("app.worker.deliver", fail)
    while send_next(db):
        pass
    mail = mails(db, GRACE)[0]
    assert mail.attempts == 1 and mail.sent_at is None
    monkeypatch.undo()
    monkeypatch.setattr("app.clock.utcnow", lambda: time.now + timedelta(minutes=2))
    while send_next(db):
        pass
    assert mails(db, GRACE)[0].sent_at


def test_notes(grace, admin, time):
    booked(grace)
    person = admin.get("/admin/people").json()[0]["id"]
    general = admin.post("/admin/notes", json={"body": " Ask about the side door. "})
    assert general.status_code == 201
    assert general.json()["body"] == "Ask about the side door."
    assert general.json()["personId"] is None
    time.forward(minutes=1)
    about = admin.post(
        "/admin/notes", json={"body": "Needs a ride.", "personId": person}
    ).json()
    assert about["personName"] == "Grace"

    newest_first = [n["id"] for n in admin.get("/admin/notes").json()]
    assert newest_first == [about["id"], general.json()["id"]]
    only = admin.get("/admin/notes", params={"personId": person}).json()
    assert [n["id"] for n in only] == [about["id"]]
    assert admin.get(f"/admin/people/{person}").json()["notes"] == only

    edited = admin.patch(
        f"/admin/notes/{about['id']}", json={"body": "Esther will drive."}
    )
    assert (edited.json()["body"], edited.json()["personId"]) == (
        "Esther will drive.",
        None,
    )

    for bad in ({"body": " "}, {"body": "x" * 5001}, {"body": "a\x00b"}):
        check_error(admin.post("/admin/notes", json=bad), 422, "validation")
    unknown = {"body": "x", "personId": "00000000-0000-0000-0000-000000000000"}
    check_error(admin.post("/admin/notes", json=unknown), 404, "not_found")

    assert admin.delete(f"/admin/notes/{about['id']}").status_code == 204
    check_error(admin.delete(f"/admin/notes/{about['id']}"), 404, "not_found")
    assert len(admin.get("/admin/notes").json()) == 1
