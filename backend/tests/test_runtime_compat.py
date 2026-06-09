import uuid

from app.models.engram import ArchetypalAI, AIConversation, DailyQuestionResponse, AITask


def test_archetypal_ai_legacy_compatibility_fields():
    engram = ArchetypalAI(training_status="untrained")

    assert engram.is_ai_active is False

    engram.is_ai_active = True
    assert engram.training_status == "active"
    assert engram.is_ai_active is True

    engram.ai_readiness_score = 82
    assert engram.ai_readiness_score == 82
    assert engram.dimension_scores["ai_readiness_score"] == 82


def test_legacy_engram_aliases_map_to_current_columns():
    entity_id = uuid.uuid4()

    conversation = AIConversation(engram_id=entity_id)
    response = DailyQuestionResponse(engram_id=entity_id)
    task = AITask(engram_id=entity_id, task_name="Test Task", task_description="Run task")

    assert conversation.ai_id == entity_id
    assert response.ai_id == entity_id
    assert task.ai_id == entity_id
    assert task.description == "Run task"

    task.task_type = "custom"
    task.execution_log = []
    task.execution_log.append({"status": "completed"})

    assert task.task_type == "custom"
    assert task.execution_log == [{"status": "completed"}]
