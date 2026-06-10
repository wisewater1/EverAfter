import pytest

from app.api.genealogy import _fetch_supabase_tree


class _FakeResponse:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    def __init__(self, table_name, recorder, responses):
        self.table_name = table_name
        self.recorder = recorder
        self.responses = responses

    def select(self, value):
        self.recorder.append((self.table_name, "select", value))
        return self

    def eq(self, field, value):
        self.recorder.append((self.table_name, "eq", field, value))
        return self

    def or_(self, expression):
        self.recorder.append((self.table_name, "or", expression))
        return self

    def execute(self):
        return _FakeResponse(self.responses.get(self.table_name, []))


class _FakeClient:
    def __init__(self, recorder, responses):
        self.recorder = recorder
        self.responses = responses

    def table(self, table_name):
        return _FakeQuery(table_name, self.recorder, self.responses)


@pytest.mark.asyncio
async def test_supabase_tree_fallback_scopes_relationship_queries(monkeypatch):
    recorder = []
    responses = {
        "family_nodes": [{"id": "node-1", "user_id": "user-1"}, {"id": "node-2", "user_id": "user-1"}],
        "family_relationships": [{"id": "rel-1", "from_node_id": "node-1", "to_node_id": "node-2"}],
    }

    monkeypatch.setattr(
        "app.api.genealogy.create_supabase_client",
        lambda: _FakeClient(recorder, responses),
    )

    tree = await _fetch_supabase_tree("user-1")

    assert tree["relationships"] == responses["family_relationships"]
    assert ("family_relationships", "or", "from_node_id.in.(node-1,node-2),to_node_id.in.(node-1,node-2)") in recorder
