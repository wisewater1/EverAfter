from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.schemas.engram import ChatMessageCreate, ChatMessageResponse, ConversationResponse
from app.models.engram import Engram, AIConversation, AIMessage
from app.ai.llm_client import get_llm_client
from app.ai.prompt_builder import get_prompt_builder

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


@router.post("/{engram_id}/message", response_model=ChatMessageResponse)
async def send_message(
    engram_id: UUID,
    message: ChatMessageCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    engram_query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(engram_query)
    engram = result.scalar_one_or_none()

    if not engram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engram not found"
        )

    if not engram.is_ai_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI is not activated for this engram. Activate it first."
        )

    user_id = str(current_user.get("sub"))

    conversation_query = select(AIConversation).where(
        AIConversation.engram_id == engram_id,
        AIConversation.user_id == user_id
    ).order_by(AIConversation.updated_at.desc())
    conv_result = await session.execute(conversation_query)
    conversation = conv_result.scalar_one_or_none()

    if not conversation:
        conversation = AIConversation(
            engram_id=engram_id,
            user_id=user_id,
            title=f"Chat with {engram.name}"
        )
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)

    user_message = AIMessage(
        conversation_id=conversation.id,
        role="user",
        content=message.content
    )
    session.add(user_message)
    await session.commit()

    messages_query = select(AIMessage).where(
        AIMessage.conversation_id == conversation.id
    ).order_by(AIMessage.created_at.asc()).limit(20)
    messages_result = await session.execute(messages_query)
    past_messages = messages_result.scalars().all()

    prompt_builder = get_prompt_builder()
    system_prompt = await prompt_builder.build_engram_system_prompt(session, str(engram_id))

    context = await prompt_builder.get_relevant_context(session, str(engram_id), message.content)
    context_text = prompt_builder.format_context_for_prompt(context)

    if context_text:
        system_prompt += "\n\n" + context_text

    conversation_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in past_messages[-10:]
    ]

    llm_client = get_llm_client()
    ai_response_text = await llm_client.generate_response(
        messages=conversation_messages,
        system_prompt=system_prompt
    )

    ai_message = AIMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_response_text
    )
    session.add(ai_message)
    await session.commit()
    await session.refresh(ai_message)

    return ai_message


@router.get("/{engram_id}/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user.get("sub"))

    query = select(AIConversation).where(
        AIConversation.engram_id == engram_id,
        AIConversation.user_id == user_id
    ).order_by(AIConversation.updated_at.desc())

    result = await session.execute(query)
    conversations = result.scalars().all()

    response = []
    for conv in conversations:
        messages_query = select(AIMessage).where(
            AIMessage.conversation_id == conv.id
        ).order_by(AIMessage.created_at.asc())
        messages_result = await session.execute(messages_query)
        messages = messages_result.scalars().all()

        response.append(ConversationResponse(
            id=conv.id,
            engram_id=conv.engram_id,
            user_id=conv.user_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=[ChatMessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at
            ) for msg in messages]
        ))

    return response


@router.get("/conversation/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(AIConversation).where(AIConversation.id == conversation_id)
    result = await session.execute(query)
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    messages_query = select(AIMessage).where(
        AIMessage.conversation_id == conversation.id
    ).order_by(AIMessage.created_at.asc())
    messages_result = await session.execute(messages_query)
    messages = messages_result.scalars().all()

    return ConversationResponse(
        id=conversation.id,
        engram_id=conversation.engram_id,
        user_id=conversation.user_id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[ChatMessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at
        ) for msg in messages]
    )


@router.delete("/conversation/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(AIConversation).where(AIConversation.id == conversation_id)
    result = await session.execute(query)
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    await session.delete(conversation)
    await session.commit()
