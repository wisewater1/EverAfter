import urllib.request
import json
import os

# Supabase Configuration
SUPABASE_URL = "https://sncvecvgxwkkxnxbvglv.supabase.co"
# Using SERVICE ROLE KEY to bypass RLS for seeding
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def make_request(url, method='GET', data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data:
        req.data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req) as response:
            if response.status in [200, 201, 204]:
                content = response.read().decode('utf-8')
                return json.loads(content) if content else True
            return False
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} {e.reason}")
        print(e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def seed_marketplace():
    print("🌱 Seeding Marketplace AIs via Python (Service Role)...")

    templates = [
        {
            "name": "grief_counselor",
            "title": "Grief Counselor AI",
            "description": "Compassionate support trained in grief processing, loss navigation, and emotional healing techniques.",
            "category": "Wellness",
            "creator_name": "Licensed Therapist Collective",
            "creator_badge": "Verified Expert",
            "price_usd": 24.99,
            "is_featured": True,
            "personality_traits": {
                "expertise": ["grief processing", "emotional support", "coping strategies", "healing journey"],
                "style": "empathetic and patient",
                "tone": "warm and understanding"
            },
            "sample_conversations": [
                {
                    "question": "I am struggling with recent loss",
                    "response": "I hear your pain, and I want you to know that what you are feeling is valid. Healing takes time, and I am here to walk beside you."
                }
            ],
            "avatar_url": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&q=80&w=200&h=200"
        },
        {
            "name": "wealth_mentor",
            "title": "Wealth Mentor AI",
            "description": "Expert financial advisor trained on decades of investment wisdom, portfolio management, and wealth-building strategies.",
            "category": "Finance",
            "creator_name": "Expert Finance Team",
            "creator_badge": "Verified Expert",
            "price_usd": 29.99,
            "is_featured": True,
            "personality_traits": {
                "expertise": ["investment strategy", "portfolio management", "tax optimization", "retirement planning"],
                "style": "analytical and strategic",
                "tone": "professional yet approachable"
            },
            "sample_conversations": [
                {
                    "question": "How should I diversify my portfolio?",
                    "response": "Diversification is key to managing risk. Let's look at your age, goals, and risk tolerance to create a balanced asset allocation strategy."
                }
            ],
            "avatar_url": "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200"
        },
        {
            "name": "relationship_coach",
            "title": "Relationship Coach AI",
            "description": "Relationship expert trained in communication, conflict resolution, and building deeper connections.",
            "category": "Relationships",
            "creator_name": "Relationship Institute",
            "creator_badge": "Verified Expert",
            "price_usd": 22.99,
            "is_featured": True,
            "personality_traits": {
                "expertise": ["communication skills", "conflict resolution", "emotional intelligence", "intimacy building"],
                "style": "understanding and insightful",
                "tone": "caring and honest"
            },
            "sample_conversations": [
                {
                    "question": "How can I improve communication with my partner?",
                    "response": "Effective communication starts with active listening and vulnerability. Try using \"I\" statements to express your feelings without being accusatory."
                }
            ],
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200"
        },
        {
            "name": "life_coach",
            "title": "Life Coach AI",
            "description": "Motivational coach specializing in goal setting, productivity, and personal transformation.",
            "category": "Personal Development",
            "creator_name": "Peak Performance Institute",
            "creator_badge": "Verified Expert",
            "price_usd": 19.99,
            "is_featured": True,
            "personality_traits": {
                "expertise": ["goal setting", "habit formation", "motivation", "accountability"],
                "style": "encouraging and action-oriented",
                "tone": "energetic and supportive"
            },
            "sample_conversations": [
                {
                    "question": "How do I stay motivated?",
                    "response": "Motivation comes and goes, but systems keep you moving forward. Let's break your big goals into small, actionable daily habits."
                }
            ],
            "avatar_url": "https://images.unsplash.com/photo-1544717297-fa151659a150?auto=format&fit=crop&q=80&w=200&h=200"
        }
    ]

    for template in templates:
        print(f"Upserting {template['title']}...")
        success = make_request(f"{SUPABASE_URL}/rest/v1/marketplace_templates", method='POST', data=template)
        if success:
            print(f"✅ Success: {template['title']}")
            
            # Now fetch the ID
            query_data = make_request(f"{SUPABASE_URL}/rest/v1/marketplace_templates?name=eq.{template['name']}&select=id")
            if query_data:
                template_id = query_data[0]['id']
                manifest = {
                    "template_id": template_id,
                    "system_prompt": f"You are the {template['title']}. Your personality is {template['personality_traits']['style']} and your tone is {template['personality_traits']['tone']}. Your expertise includes {', '.join(template['personality_traits']['expertise'])}.",
                    "model": "gpt-4",
                    "temperature": 0.7
                }
                m_success = make_request(f"{SUPABASE_URL}/rest/v1/marketplace_template_manifests", method='POST', data=manifest)
                if m_success:
                    print(f"   ✅ Manifest Seeded")
                else:
                    print(f"   ❌ Manifest Failed for {template['title']}")
        else:
            print(f"❌ Failed: {template['title']}")

    print("✨ Seeding complete!")

if __name__ == "__main__":
    seed_marketplace()
