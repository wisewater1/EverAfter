from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import secrets
import base64
import smtplib
from email.message import EmailMessage
import os
import uuid


class InvitationService:
    """
    Manages invitation system for family members to answer their own questions
    Key distinction: Family members answer about themselves, not answered by user
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    def _is_family_member_engram(self, engram) -> bool:
        traits = (engram.personality_traits or {}) if engram else {}
        return bool(
            traits.get("memberId")
            or traits.get("familyRole")
            or traits.get("engram_type") == "family_member"
            or traits.get("is_dynamic_agent")
        )

    async def _get_or_create_family_member_engram(
        self,
        inviter_user_id: str,
        invitee_name: str,
        relationship: Optional[str],
    ):
        from app.models.engram import Engram

        inviter_uuid = uuid.UUID(str(inviter_user_id))
        normalized_name = invitee_name.strip()

        query = select(Engram).where(
            Engram.user_id == inviter_uuid,
            Engram.name == normalized_name,
        )
        result = await self.session.execute(query)
        for engram in result.scalars().all():
            if self._is_family_member_engram(engram):
                return engram

        family_role = (relationship or "family").strip().lower()
        new_engram = Engram(
            user_id=inviter_uuid,
            name=normalized_name,
            description=f"Family member engram for {normalized_name}",
            personality_traits={
                "memberId": f"invite-{uuid.uuid4()}",
                "familyRole": family_role,
                "engram_type": "family_member",
                "is_dynamic_agent": True,
            },
            training_status="untrained",
        )
        self.session.add(new_engram)
        await self.session.flush()
        return new_engram

    async def create_invitation(
        self,
        engram_id: Optional[str],
        inviter_user_id: str,
        invitee_email: str,
        invitee_name: str,
        relationship: Optional[str] = None,
        invitation_message: Optional[str] = None,
        questions_to_answer: int = 365
    ) -> Dict:
        """
        Create invitation for family member to answer questions about themselves
        """
        from app.models.engram import Engram, FamilyMemberInvitation

        if engram_id:
            engram_query = select(Engram).where(Engram.id == engram_id)
            result = await self.session.execute(engram_query)
            engram = result.scalar_one_or_none()

            if not engram:
                raise ValueError("Engram not found")

            if not self._is_family_member_engram(engram):
                raise ValueError("Invitations can only be sent for family_member engrams")
        else:
            engram = await self._get_or_create_family_member_engram(
                inviter_user_id=inviter_user_id,
                invitee_name=invitee_name,
                relationship=relationship,
            )

        # Generate secure invitation token
        token = self._generate_secure_token()

        # Create invitation
        invitation = FamilyMemberInvitation(
            engram_id=engram.id if isinstance(engram.id, uuid.UUID) else uuid.UUID(str(engram.id)),
            inviter_user_id=uuid.UUID(str(inviter_user_id)),
            invitee_email=invitee_email,
            invitee_name=invitee_name,
            invitation_token=token,
            invitation_message=invitation_message or self._get_default_message(engram.name, invitee_name),
            status='pending',
            delivery_status='pending',
            questions_to_answer=questions_to_answer,
            sent_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30)
        )

        self.session.add(invitation)
        await self.session.commit()
        await self.session.refresh(invitation)

        # Generate invitation URL
        invitation_url = self._generate_invitation_url(token)

        delivery = await self._send_invitation_email(
            invitee_email,
            invitation_url,
            invitation.invitation_message,
        )
        invitation.delivery_status = delivery["status"]
        invitation.delivery_error = delivery.get("error")
        await self.session.commit()
        await self.session.refresh(invitation)

        return {
            "invitation_id": str(invitation.id),
            "engram_id": str(engram.id),
            "token": token,
            "url": invitation_url,
            "expires_at": invitation.expires_at.isoformat(),
            "status": invitation.status,
            "delivery_status": invitation.delivery_status,
            "delivery_error": invitation.delivery_error,
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
        base_url = os.getenv("FRONTEND_URL", "https://everafterai.net")
        return f"{base_url}/respond/{token}"

    async def _send_invitation_email(self, invitee_email: str, invitation_url: str, message: str) -> Dict[str, Optional[str]]:
        """Send the invitation email using SMTP"""
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")

        if not all([smtp_server, smtp_username, smtp_password]):
            return {
                "status": "pending_config",
                "error": "SMTP is not configured for invitation delivery.",
            }

        msg = EmailMessage()
        msg.set_content(f"{message}\n\nPlease click the link to start your journey:\n{invitation_url}")
        msg['Subject'] = 'You have been invited to share your personality on EverAfter'
        msg['From'] = smtp_username
        msg['To'] = invitee_email

        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            return {"status": "sent", "error": None}
        except Exception as e:
            return {"status": "failed", "error": str(e)}


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
            "status": invitation.status,
            "delivery_status": invitation.delivery_status,
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
            invitation_id=invitation.id,
            engram_id=invitation.engram_id,
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

    async def get_invitation_stats(self, invitation_id: str, inviter_user_id: Optional[str] = None) -> Dict:
        """Get statistics for an invitation"""
        from app.models.engram import FamilyMemberInvitation, ExternalResponse

        invitation_uuid = uuid.UUID(str(invitation_id))
        query = select(FamilyMemberInvitation).where(
            FamilyMemberInvitation.id == invitation_uuid
        )
        if inviter_user_id:
            query = query.where(FamilyMemberInvitation.inviter_user_id == uuid.UUID(str(inviter_user_id)))
        result = await self.session.execute(query)
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise ValueError("Invitation not found")

        # Get response statistics
        responses_query = select(ExternalResponse).where(
            ExternalResponse.invitation_id == invitation_uuid
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
            "delivery_status": invitation.delivery_status,
            "delivery_error": invitation.delivery_error,
            "last_response_at": invitation.last_response_at.isoformat() if invitation.last_response_at else None,
            "accepted_at": invitation.accepted_at.isoformat() if invitation.accepted_at else None,
            "expires_at": invitation.expires_at.isoformat()
        }

    async def list_invitations(self, user_id: str) -> list:
        """List all invitations created by a user"""
        from app.models.engram import FamilyMemberInvitation

        user_uuid = uuid.UUID(str(user_id))
        query = select(FamilyMemberInvitation).where(
            FamilyMemberInvitation.inviter_user_id == user_uuid
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
                "delivery_status": inv.delivery_status,
                "questions_answered": inv.questions_answered,
                "questions_total": inv.questions_to_answer,
                "completion_percentage": int((inv.questions_answered / inv.questions_to_answer) * 100),
                "sent_at": inv.sent_at.isoformat(),
                "expires_at": inv.expires_at.isoformat()
            }
            for inv in invitations
        ]
