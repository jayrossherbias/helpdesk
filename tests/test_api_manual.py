"""
Manual API test suite -- runs against a live Django dev server on localhost:8000.
Usage: python tests/test_api_manual.py
"""
import sys
import json
import httpx

BASE = "http://localhost:8000/api/v1"

# Shared state across tests
STATE = {}


# -- helpers ------------------------------------------------------------------

def _auth(username, password):
    r = httpx.post(f"{BASE}/auth/login/",
                   json={"username": username, "password": password})
    if r.status_code != 200:
        raise AssertionError(
            f"Login failed for {username!r}: {r.status_code} {r.text}"
        )
    return r.json()["access"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# -- tests --------------------------------------------------------------------

def test_01_health_check():
    """GET login/ must return 405 (POST-only endpoint)."""
    r = httpx.get(f"{BASE}/auth/login/")
    assert r.status_code == 405, (
        f"Expected 405, got {r.status_code}\n    response: {r.text}"
    )


def test_02_wrong_credentials():
    """Login with bad creds must return 400 with an error message."""
    r = httpx.post(f"{BASE}/auth/login/",
                   json={"username": "wrong", "password": "wrong"})
    assert r.status_code == 400, (
        f"Expected 400, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()
    assert "non_field_errors" in data, (
        f"Expected 'non_field_errors' key in response\n    got: {data}"
    )


def test_03_create_ticket_priority_and_routing():
    """
    Create ticket as agent_mkti1 with 12 agents_affected.
    - priority must be 'high' (5-19 agents range)
    - assigned_to must NOT be null (routing engine must fire)
    """
    token = _auth("agent_mkti1", "Test1234!")
    r = httpx.post(
        f"{BASE}/tickets/",
        headers=_h(token),
        json={
            "title": "VoIP dialer not working for agents",
            "description": "Phone dialer crashing, call drops on voip system",
            "category": "voip_dialer",
            "shift": "morning",
            "agents_affected": 12,
            "floor_team": "Team A",
            "is_floor_wide": False,
        },
    )
    assert r.status_code == 201, (
        f"Expected 201, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()

    priority = data.get("priority")
    assert priority == "high", (
        f"Expected priority='high' (12 agents in 5-19 range)\n"
        f"    actual priority: {priority!r}\n    full response: {json.dumps(data, default=str)}"
    )

    assigned_to = data.get("assigned_to")
    assert assigned_to is not None, (
        f"Expected assigned_to to be set by routing engine, got null\n"
        f"    full response: {json.dumps(data, default=str)}"
    )

    STATE["ticket_id"] = data["id"]
    STATE["assigned_username"] = assigned_to["username"]
    print(f"    priority={priority}, assigned_to={assigned_to['username']}, id={data['id']}")


def test_04_branch_scoping():
    """supervisor_mkti (Makati Branch) must only see Makati tickets in list."""
    token = _auth("supervisor_mkti", "Test1234!")
    r = httpx.get(f"{BASE}/tickets/", headers=_h(token))
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()
    results = data["results"]
    assert len(results) >= 1, "Expected at least 1 ticket visible to supervisor_mkti"

    for ticket in results:
        branch_name = ticket["branch"]["name"]
        assert branch_name == "Makati Branch", (
            f"Branch scoping broken -- supervisor_mkti saw ticket from '{branch_name}'\n"
            f"    ticket id: {ticket['id']}"
        )
    print(f"    supervisor_mkti sees {len(results)} ticket(s), all in Makati Branch")


def test_05_admin_sees_all_branches():
    """admin (main_it_manager) must see tickets from every branch."""
    token = _auth("admin", "Test1234!")
    r = httpx.get(f"{BASE}/tickets/", headers=_h(token))
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()
    assert data["count"] >= 1, (
        f"Admin should see at least 1 ticket, got count={data['count']}"
    )
    print(f"    admin sees {data['count']} total ticket(s) across all branches")


def test_06_update_status():
    """PATCH /{id}/status/ -- move ticket to in_progress."""
    token = _auth("supervisor_mkti", "Test1234!")
    ticket_id = STATE["ticket_id"]
    r = httpx.patch(
        f"{BASE}/tickets/{ticket_id}/status/",
        headers=_h(token),
        json={"status": "in_progress"},
    )
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()
    assert data["status"] == "in_progress", (
        f"Expected status='in_progress', got {data['status']!r}"
    )
    print("    ticket status -> in_progress")


def test_07_assign_ticket():
    """PATCH /{id}/assign/ -- manually assign to a Makati technician."""
    token = _auth("supervisor_mkti", "Test1234!")

    r = httpx.get(
        f"{BASE}/accounts/users/?role=branch_technician",
        headers=_h(token),
    )
    assert r.status_code == 200, (
        f"Failed to list technicians: {r.status_code} {r.text}"
    )
    technicians = r.json()["results"]
    assert len(technicians) > 0, "No branch_technician users found for Makati Branch"
    tech = technicians[0]

    ticket_id = STATE["ticket_id"]
    r = httpx.patch(
        f"{BASE}/tickets/{ticket_id}/assign/",
        headers=_h(token),
        json={"assigned_to": tech["id"]},
    )
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()
    assert data["assigned_to"] is not None, "assigned_to should not be null after assign"
    STATE["manual_assigned"] = data["assigned_to"]["username"]
    print(f"    ticket manually assigned to {STATE['manual_assigned']}")


def test_08_escalate_ticket():
    """POST /{id}/escalate/ -- escalated field must be True after escalation."""
    token = _auth("supervisor_mkti", "Test1234!")
    ticket_id = STATE["ticket_id"]
    r = httpx.post(
        f"{BASE}/tickets/{ticket_id}/escalate/",
        headers=_h(token),
        json={"reason": "Critical VoIP outage affecting entire floor, needs manager attention."},
    )
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()
    assert data["escalated"] is True, (
        f"Expected escalated=True, got {data['escalated']!r}\n"
        f"    full response: {json.dumps(data, default=str)}"
    )
    has_log = data.get("escalation_log") is not None
    print(f"    ticket escalated=True, escalation_log present: {has_log}")


def test_09_admin_escalation_notification():
    """After escalation, admin must have an escalation_triggered notification."""
    token = _auth("admin", "Test1234!")
    r = httpx.get(f"{BASE}/notifications/", headers=_h(token))
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}\n    response: {r.text}"
    )
    data = r.json()
    types = [n["notification_type"] for n in data["results"]]
    assert "escalation_triggered" in types, (
        f"Expected at least one 'escalation_triggered' notification for admin\n"
        f"    notification types found: {types}\n"
        f"    unread_count: {data['unread_count']}"
    )
    count = types.count("escalation_triggered")
    print(f"    admin has {count} escalation_triggered notification(s), unread_count={data['unread_count']}")


def test_10_read_all_notifications():
    """POST /notifications/read-all/ -- all admin notifications must become read."""
    token = _auth("admin", "Test1234!")
    r = httpx.post(f"{BASE}/notifications/read-all/", headers=_h(token))
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}\n    response: {r.text}"
    )
    marked = r.json()["marked_read"]
    assert marked >= 1, f"Expected at least 1 notification marked read, got {marked}"

    r2 = httpx.get(f"{BASE}/notifications/", headers=_h(token))
    unread = r2.json()["unread_count"]
    assert unread == 0, f"Expected unread_count=0 after read-all, got {unread}"
    print(f"    {marked} notification(s) marked read, unread_count now={unread}")


# -- runner -------------------------------------------------------------------

TESTS = [
    test_01_health_check,
    test_02_wrong_credentials,
    test_03_create_ticket_priority_and_routing,
    test_04_branch_scoping,
    test_05_admin_sees_all_branches,
    test_06_update_status,
    test_07_assign_ticket,
    test_08_escalate_ticket,
    test_09_admin_escalation_notification,
    test_10_read_all_notifications,
]

if __name__ == "__main__":
    passed = failed = 0
    for test in TESTS:
        name = test.__name__
        try:
            test()
            print(f"PASS  {name}")
            passed += 1
        except AssertionError as exc:
            print(f"FAIL  {name}")
            for line in str(exc).splitlines():
                print(f"  {line}")
            failed += 1
        except Exception as exc:
            print(f"ERROR {name}: {type(exc).__name__}: {exc}")
            failed += 1

    print(f"\n{'='*55}")
    print(f"Results: {passed}/{passed + failed} passed", end="")
    print("  -- ALL PASS" if failed == 0 else f"  -- {failed} FAILED")
    sys.exit(0 if failed == 0 else 1)
