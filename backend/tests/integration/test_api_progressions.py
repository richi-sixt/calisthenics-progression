"""Integration tests for child-exercise progressions (parent/child links)."""

import json

import pytest


def _create(client, headers, title, **extra):
    resp = client.post(
        "/api/v1/exercises",
        headers=headers,
        data=json.dumps({"title": title, **extra}),
    )
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["data"]["id"]


def _put_steps(client, headers, parent_id, steps):
    return client.put(
        f"/api/v1/exercises/{parent_id}/progressions",
        headers=headers,
        data=json.dumps({"progressions": steps}),
    )


def _get(client, headers, exercise_id):
    resp = client.get(f"/api/v1/exercises/{exercise_id}", headers=headers)
    assert resp.status_code == 200
    return resp.get_json()["data"]


@pytest.fixture
def pullups(client, api_headers):
    parent = _create(client, api_headers, "Pull-ups")
    scap = _create(client, api_headers, "Scapular Pull-ups")
    band = _create(client, api_headers, "Band-assisted Pull-ups")
    neg = _create(client, api_headers, "Negative Pull-ups")
    return {"parent": parent, "scap": scap, "band": band, "neg": neg}


class TestSetProgressions:
    def test_set_and_order(self, client, api_headers, pullups):
        p = pullups
        resp = _put_steps(
            client, api_headers, p["parent"], [p["scap"], p["band"], p["neg"]]
        )
        assert resp.status_code == 200
        steps = resp.get_json()["data"]["progressions"]
        assert [s["title"] for s in steps] == [
            "Scapular Pull-ups",
            "Band-assisted Pull-ups",
            "Negative Pull-ups",
        ]
        assert [s["step_order"] for s in steps] == [1, 2, 3]

    def test_reorder(self, client, api_headers, pullups):
        p = pullups
        _put_steps(client, api_headers, p["parent"], [p["scap"], p["band"], p["neg"]])
        resp = _put_steps(
            client, api_headers, p["parent"], [p["neg"], p["scap"], p["band"]]
        )
        titles = [s["title"] for s in resp.get_json()["data"]["progressions"]]
        assert titles == [
            "Negative Pull-ups",
            "Scapular Pull-ups",
            "Band-assisted Pull-ups",
        ]

    def test_accepts_objects_with_id(self, client, api_headers, pullups):
        p = pullups
        resp = _put_steps(client, api_headers, p["parent"], [{"id": p["scap"]}])
        assert resp.status_code == 200

    def test_remove_all(self, client, api_headers, pullups):
        p = pullups
        _put_steps(client, api_headers, p["parent"], [p["scap"]])
        resp = _put_steps(client, api_headers, p["parent"], [])
        assert resp.get_json()["data"]["progressions"] == []

    def test_child_lists_parent(self, client, api_headers, pullups):
        p = pullups
        _put_steps(client, api_headers, p["parent"], [p["scap"]])
        child = _get(client, api_headers, p["scap"])
        assert child["parents"] == [{"id": p["parent"], "title": "Pull-ups"}]

    def test_via_create_and_update(self, client, api_headers, pullups):
        p = pullups
        new_id = _create(client, api_headers, "Chin-ups", progressions=[p["scap"]])
        assert len(_get(client, api_headers, new_id)["progressions"]) == 1
        resp = client.put(
            f"/api/v1/exercises/{new_id}",
            headers=api_headers,
            data=json.dumps({"progressions": [p["band"], p["neg"]]}),
        )
        assert [s["id"] for s in resp.get_json()["data"]["progressions"]] == [
            p["band"],
            p["neg"],
        ]

    def test_legacy_progression_levels_derived(self, client, api_headers, pullups):
        p = pullups
        _put_steps(client, api_headers, p["parent"], [p["scap"], p["band"]])
        levels = _get(client, api_headers, p["parent"])["progression_levels"]
        assert [(lv["name"], lv["level_order"]) for lv in levels] == [
            ("Scapular Pull-ups", 1),
            ("Band-assisted Pull-ups", 2),
        ]

    @pytest.mark.parametrize(
        "bad", ["x", [True], ["1"], [1, 1], [999999], list(range(1, 40))]
    )
    def test_rejects_invalid(self, client, api_headers, pullups, bad):
        resp = _put_steps(client, api_headers, pullups["parent"], bad)
        assert resp.status_code == 400

    def test_rejects_self_link(self, client, api_headers, pullups):
        resp = _put_steps(client, api_headers, pullups["parent"], [pullups["parent"]])
        assert resp.status_code == 400

    def test_rejects_direct_and_indirect_cycles(self, client, api_headers, pullups):
        p = pullups
        assert (
            _put_steps(client, api_headers, p["parent"], [p["scap"]]).status_code == 200
        )
        assert (
            _put_steps(client, api_headers, p["scap"], [p["band"]]).status_code == 200
        )
        # scap is already a child of parent
        assert (
            _put_steps(client, api_headers, p["scap"], [p["parent"]]).status_code == 400
        )
        # band is a grandchild of parent
        assert (
            _put_steps(client, api_headers, p["band"], [p["parent"]]).status_code == 400
        )

    def test_failed_update_keeps_existing_links(self, client, api_headers, pullups):
        p = pullups
        _put_steps(client, api_headers, p["parent"], [p["scap"]])
        assert _put_steps(client, api_headers, p["parent"], [999999]).status_code == 400
        assert len(_get(client, api_headers, p["parent"])["progressions"]) == 1

    def test_rejects_archived_child(self, client, api_headers, pullups):
        p = pullups
        client.delete(f"/api/v1/exercises/{p['scap']}", headers=api_headers)
        assert (
            _put_steps(client, api_headers, p["parent"], [p["scap"]]).status_code == 400
        )

    def test_archived_child_hidden_but_link_kept(self, client, api_headers, pullups):
        p = pullups
        _put_steps(client, api_headers, p["parent"], [p["scap"], p["band"]])
        client.delete(f"/api/v1/exercises/{p['scap']}", headers=api_headers)
        steps = _get(client, api_headers, p["parent"])["progressions"]
        assert [s["id"] for s in steps] == [p["band"]]

    def test_only_owner_can_edit(
        self, client, api_headers, api_headers_second, pullups
    ):
        resp = _put_steps(client, api_headers_second, pullups["parent"], [])
        assert resp.status_code == 403

    def test_cannot_use_someone_elses_exercise_as_child(
        self, client, api_headers, api_headers_second
    ):
        mine = _create(client, api_headers, "Mine")
        theirs = _create(client, api_headers_second, "Theirs", visibility="public")
        assert _put_steps(client, api_headers, mine, [theirs]).status_code == 400

    def test_unknown_parent_404(self, client, api_headers):
        assert _put_steps(client, api_headers, 999999, []).status_code == 404


class TestProgressionVisibility:
    def test_private_child_hidden_from_other_viewer(
        self, client, api_headers, api_headers_second
    ):
        parent = _create(client, api_headers, "Parent", visibility="public")
        shown = _create(client, api_headers, "Shown", visibility="public")
        hidden = _create(client, api_headers, "Hidden", visibility="private")
        _put_steps(client, api_headers, parent, [shown, hidden])

        data = _get(client, api_headers_second, parent)
        assert [s["title"] for s in data["progressions"]] == ["Shown"]
        assert [lv["name"] for lv in data["progression_levels"]] == ["Shown"]
        # the owner still sees both
        assert len(_get(client, api_headers, parent)["progressions"]) == 2


class TestCopyWithProgressions:
    def test_copy_copies_visible_children_in_order(
        self, client, api_headers, api_headers_second
    ):
        parent = _create(client, api_headers, "Pike Stand", visibility="public")
        low = _create(client, api_headers, "Low Pike", visibility="public")
        high = _create(client, api_headers, "High Pike", visibility="public")
        secret = _create(client, api_headers, "Secret", visibility="private")
        _put_steps(client, api_headers, parent, [low, secret, high])

        resp = client.post(
            f"/api/v1/exercises/{parent}/copy", headers=api_headers_second
        )
        assert resp.status_code == 201
        copy = resp.get_json()["data"]
        assert copy["title"] == "Pike Stand (Kopie)"
        assert [s["title"] for s in copy["progressions"]] == ["Low Pike", "High Pike"]
        # copies belong to the copier, not the original ids
        assert {s["id"] for s in copy["progressions"]}.isdisjoint({low, high})
        mine = client.get("/api/v1/exercises", headers=api_headers_second).get_json()
        assert len(mine["data"]) == 3

    def test_copy_without_children(self, client, api_headers, api_headers_second):
        parent = _create(client, api_headers, "Plain", visibility="public")
        resp = client.post(
            f"/api/v1/exercises/{parent}/copy", headers=api_headers_second
        )
        assert resp.get_json()["data"]["progressions"] == []
