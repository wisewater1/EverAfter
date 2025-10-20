from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import secrets
import base64


class InvitationService:
    """
    Manages invitation system for family members to answer their own questions
    Key distinction: Family members answer about themselves, not answered by user
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_invitation(
        self,
        engram_id: str,
        inviter_user_id: str,
        invitee_email: str,
        invitee_name: str,
        invitation_message: Optional[str] = None,
        questions_to_answer: int = 365
    ) -> Dict:
        """
        Create invitation for family member to answer questions about themselves
        """
        from app.models.engram import Engram, FamilyMemberInvitation

        # Verify engram exists and is a family_member type
        engram_query = select(Engram).where(Engram.id == engram_id)
        result = await self.session.execute(engram_query)
        engram = result.scalar_one_or_none()

        if not engram:
            raise ValueError("Engram not found")

        if engram.engram_type != "family_member":
            raise ValueError("Invitations can only be sent for family_member engrams")

        # Generate secure invitation token
        token = self._generate_secure_token()

        # Create invitation
        invitation = FamilyMemberInvitation(
            engram_id=engram_id,
            inviter_user_id=inviter_user_id,
            invitee_email=invitee_email,
            invitee_name=invitee_name,
            invitation_token=token,
            invitation_message=invitation_message or self._get_default_message(engram.name, invitee_name),
            status='pending',
            questions_to_answer=questions_to_answer,
            sent_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30)
        )

        self.session.add(invitation)
        await self.session.commit()
        await self.session.refresh(invitation)

        # Generate invitation URL
        invitation_url = self._generate_invitation_url(token)

        # TODO: Send email via email service
        # await self._send_invitation_email(invitee_email, invitation_url, invitation_message)

        return {
            "invitation_id": str(invitation.id),
            "token": token,
            "url": invitation_url,
            "expires_at": invitation.expires_at.isoformat(),
            "status": "sent"
        }

    def _generate_secure_token(self) -> str:
        """Generate cryptographically secure invitation token"""
        random_bytes = secrets.token_bytes(32)
        return base64.urlsafe_b64encode(random_bytes).decode('utf-8').rstrip('=')

    def _get_default_message(self, engram_name: str, invitee_name: str) -> str:
        """Generate default invitation message"""
        return f"""
Hi {invitee_name},

I'm creating a digital legacy engram for {engram_name} on EverAfter. This will help preserve their personality, memories, and essence for future generations.

To make this as authentic as possible, I'd love for you to share your own memories, stories, and perspectives about yourself by answering some daily questions.

This is a meaningful way to preserve your legacy and create a lasting connection with future family members.

The questions will take just a few minutes each day and will help build a comprehensive picture of who you are.

Thank you for participating in this special project!
        """.strip()

    def _generate_invitation_url(self, token: str) -> str:
        """Generate invitation URL"""
        # In production, use actual domain
        base_url = "https://everafter.app"
        return f"{base_url}/respond/{token}"

    async def accept_invitation(self, token: str) -> Dict:
        """
        Accept an invitation and allow family member to start responding
        """
        from app.models.engram import FamilyMemberInvitation

        # Find invitation by token
        query = select(FamilyMemberInvitation).where(
            FamilyMemberInvitation.invitation_token == token
        )
        result = await self.session.execute(query)
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError("Invalid invitation token")

        if invitation.status != 'pending':
            raise ValueError(f"Invitation already {invitation.status}")

        if invitation.expires_at < datetime.utcnow():
            invitation.status = 'expired'
            await self.session.commit()
            raise ValueError("Invitation has expired")

        # Accept invitation
        invitation.status = 'accepted'
        invitation.accepted_at = datetime.utcnow()
        await self.session.commit()

        return {
            "invitation_id": str(invitation.id),
            "engram_id": str(invitation.engram_id),
            "invitee_name": invitation.invitee_name,
            "questions_to_answer": invitation.questions_to_answer,
            "questions_answered": invitation.questions_answered,
            "status": "accepted"
        }

    async def get_question_for_invitee(self, token: str) -> Dict:
        """
        Get next question for invited family member
        """
        from app.models.engram import FamilyMemberInvitation, ExternalResponse, Engram
        from app.models.engram import DailyQuestionPool

        # Verify invitation
        invitation = await self._verify_invitation(token)

        # Get next day number
        next_day = invitation.questions_answered + 1

        if next_day > invitation.questions_to_answer:
            return {
                "completed": True,
                "message": "You've answered all questions! Thank you for your participation."
            }

        # Get question for this day
        query = select(DailyQuestionPool).where(
            DailyQuestionPool.day_range_start <= next_day,
            DailyQuestionPool.day_range_end >= next_day,
            DailyQuestionPool.is_active == True
        ).order_by(DailyQuestionPool.usage_count.asc()).limit(1)

        result = await self.session.execute(query)
        question = result.scalar_one_or_none()

        if not question:
            # Fallback to any active question
            query = select(DailyQuestionPool).where(
                DailyQuestionPool.is_active == True
            ).order_by(DailyQuestionPool.usage_count.asc()).limit(1)
            result = await self.session.execute(query)
            question = result.scalar_one_or_none()

        if not question:
            raise ValueError("No questions available")

        return {
            "question_id": str(question.id),
            "question_text": question.question_text,
            "day_number": next_day,
            "category": question.category_id,
            "dimension": question.dimension_id,
            "requires_deep_thought": question.requires_deep_thought,
            "progress": {
                "answered": invitation.questions_answered,
                "total": invitation.questions_to_answer,
                "percentage": int((invitation.questions_answered / invitation.questions_to_answer) * 100)
            }
        }

    async def submit_external_response(
        self,
        token: str,
        question_text: str,
        response_text: str,
        day_number: int,
        dimension_id: Optional[str] = None,
        category_id: Optional[str] = None
    ) -> Dict:
        """
        Submit response from invited family member
        This is them answering about THEMSELVES, not someone else
        """
        from app.models.engram import FamilyMemberInvitation, ExternalResponse, EngramDailyResponse

        # Verify invitation
        invitation = await self._verify_invitation(token)

        start_time = datetime.utcnow()

        # Create external response
        external_response = ExternalResponse(
            invitation_id=str(invitation.id),
            engram_id=str(invitation.engram_id),
            question_text=question_text,
            response_text=response_text,
            question_category=category_id,
            dimension_id=dimension_id,
            day_number=day_number,
            response_length=len(response_text),
            is_processed=False
        )

        self.session.add(external_response)
        await self.session.flush()

        # Also create engram_daily_response
        daily_response = EngramDailyResponse(
            engram_id=invitation.engram_id,
            user_id=invitation.inviter_user_id,
            question_text=question_text,
            response_text=response_text,
            question_category=category_id,
            day_number=day_number,
            dimension_id=dimension_id,
            category_id=category_id,
            is_external=True,
            external_response_id=str(external_response.id)
        )

        self.session.add(daily_response)

        # Update invitation progress
        invitation.questions_answered += 1
        invitation.last_response_at = datetime.utcnow()

        await self.session.commit()

        # Trigger personality analysis if enough responses
        if invitation.questions_answered % 10 == 0:
            # Analyze every 10 responses
            from app.services.personality_analyzer import PersonalityAnalyzer
            analyzer = PersonalityAnalyzer(self.session)
            await analyzer.analyze_engram_personality(str(invitation.engram_id))

        return {
            "response_id": str(external_response.id),
            "questions_answered": invitation.questions_answered,
            "questions_remaining": invitation.questions_to_answer - invitation.questions_answered,
            "percentage_complete": int((invitation.questions_answered / invitation.questions_to_answer) * 100),
            "status": "saved"
        }

    async def _verify_invitation(self, token: str):
        """Verify invitation is valid and active"""
        from app.models.engram import FamilyMemberInvitation

        query = select(FamilyMemberInvitation).where(
            FamilyMemberInvitation.invitation_token == token
        )
        result = await self.session.execute(query)
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError("Invalid invitation token")

        if invitation.status not in ['pending', 'accepted']:
            raise ValueError(f"Invitation is {invitation.status}")

        if invitation.expires_at < datetime.utcnow():
            invitation.status = 'expired'
            await self.session.commit()
            raise ValueError("Invitation has expired")

        # Auto-accept if pending
        if invitation.status == 'pending':
            invitation.status = 'accepted'
            invitation.accepted_at = datetime.utcnow()
            await self.session.commit()

        return invitation

    async def get_invitation_stats(self, invitation_id: str) -> Dict:
        """Get statistics for an invitation"""
        from app.models.engram import FamilyMemberInvitation, ExternalResponse

        query = select(FamilyMemberInvitation).where(
            FamilyMemberInvitation.id == invitation_id
        )
        result = await self.session.execute(query)
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError("Invitation not found")

        # Get response statistics
        responses_query = select(ExternalResponse).where(
            ExternalResponse.invitation_id == invitation_id
        )
        responses_result = await self.session.execute(responses_query)
        responses = responses_result.scalars().all()

        avg_length = sum(r.response_length for r in responses) / len(responses) if responses else 0

        return {
            "invitation_id": invitation_id,
            "status": invitation.status,
            "questions_answered": invitation.questions_answered,
            "questions_total": invitation.questions_to_answer,
            "completion_percentage": int((invitation.questions_answered / invitation.questions_to_answer) * 100),
            "avg_response_length": int(avg_length),
            "last_response_at": invitation.last_response_at.isoformat() if invitation.last_response_at else None,
            "accepted_at": invitation.accepted_at.isoformat() if invitation.accepted_at else None,
            "expires_at": invitation.expires_at.isoformat()
        }

    async def list_invitations(self, user_id: str) -> list:
        """List all invitations created by a user"""
        from app.models.engram import FamilyMemberInvitation

        query = select(FamilyMemberInvitation).where(
            FamilyMemberInvitation.inviter_user_id == user_id
        ).order_by(FamilyMemberInvitation.created_at.desc())

        result = await self.session.execute(query)
        invitations = result.scalars().all()

        return [
            {
                "invitation_id": str(inv.id),
                "engram_id": str(inv.engram_id),
                "invitee_email": inv.invitee_email,
                "invitee_name": inv.invitee_name,
                "status": inv.status,
                "questions_answered": inv.questions_answered,
                "questions_total": inv.questions_to_answer,
                "completion_percentage": int((inv.questions_answered / inv.questions_to_answer) * 100),
                "sent_at": inv.sent_at.isoformat(),
                "expires_at": inv.expires_at.isoformat()
            }
            for inv in invitations
        ]
