from google import genai
import json
from typing import List
from ..core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)
MODEL_NAME = 'gemini-2.5-flash'
FALLBACK_MODEL = 'gemini-pro-latest'

async def generate_quiz(context: str, proficiency: str, num_questions: int, weak_areas: List[str] = None):
    prompt = f"""
    Generate {num_questions} multiple-choice questions from the following content:
    {context}
    User Level: {proficiency}
    User Weak Areas: {", ".join(weak_areas) if weak_areas else "None"}
    Requirements:
    - Return ONLY a JSON array of objects with keys: question_text, options, correct_answer, concept_tag.
    """
    try:
        response = await client.aio.models.generate_content(model=MODEL_NAME, contents=prompt)
    except Exception as e:
        err_msg = str(e)
        print(f"AI ERROR: {err_msg}")
        if "429" in err_msg or "quota" in err_msg.lower():
            return []
        try:
            response = await client.aio.models.generate_content(model=FALLBACK_MODEL, contents=prompt)
        except: return []

    try:
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:-3].strip()
        return json.loads(text)
    except: return []

async def get_explanation(question: str, user_answer: str, correct_answer: str, proficiency: str):
    prompt = f"""
    Explain the following quiz question for a {proficiency} student.
    
    Question: {question}
    User's Choice: {user_answer}
    Correct Answer: {correct_answer}
    
    Format the response EXACTLY as follows:
    🎯 CORE CONCEPT
    (1-sentence clear summary of the logic)

    ✅ WHY IT'S RIGHT
    - (Bullet point 1)
    - (Bullet point 2)

    ⚠️ THE CAVEAT
    (Explain why the user's answer might be misleading or why this specific trap exists)

    💡 PRO-TIP
    (One-sentence actionable rule for similar questions)
    """
    try:
        response = await client.aio.models.generate_content(model=MODEL_NAME, contents=prompt)
    except:
        try:
            response = await client.aio.models.generate_content(model=FALLBACK_MODEL, contents=prompt)
        except: return "The AI tutor is currently resting. Please try again in a moment."
    return response.text.strip()

async def chat_with_tutor(message: str, history: List[dict], user_context: dict, file_context: str = None):
    status_str = f"""
    [LEARNER PROFILE]
    - Level: {user_context.get('proficiency', 'Beginner')}
    - Strengths: {", ".join(user_context.get('strengths', []))}
    - Weaknesses: {", ".join(user_context.get('weaknesses', []))}
    """
    
    pdf_str = f"\n[DOCUMENT CONTEXT]\n{file_context}" if file_context else ""
    
    system_prompt = f"""
    You are an "Adaptive Intelligence Engine" - a highly versatile and professional AI Tutor. 
    Your goal is to provide world-class, high-quality responses similar to ChatGPT or Gemini, tailored to the student's current cognitive state.
    
    {status_str}{pdf_str}
    
    ADAPTIVE BEHAVIOR:
    1. VERSATILE FORMATTING: Use the best format for the query. This includes Tables for comparisons, Bullet points for steps, and Deep-dive paragraphs for complex theory.
    2. SOCRATIC GUIDANCE: Don't just give answers. Use a "layered" approach: 
       - Tier 1: A hint or an analogy.
       - Tier 2: A guided explanation.
       - Tier 3: The complete logic for review.
    3. CODE SANDBOXING: For code, provide a "Logic Walkthrough" and use syntax-highlighted blocks.
    4. ACCESSIBILITY: Use clean, professional language. Use Markdown effectively (bolding, headers) but avoid raw "asterisk clutter". 
    5. COMPREHENSIVENESS: Provide detailed, context-rich answers. Do not truncate useful information, but remain efficient and focused.
    
    Embody an encouraging, expert persona that feels like a premium learning companion.
    """

    contents = [{"role": "user", "parts": [{"text": system_prompt}]}]
    for h in history:
        contents.append({"role": "user" if h['role'] == 'user' else 'model', "parts": [{"text": h['content']}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    try:
        response = await client.aio.models.generate_content(model=MODEL_NAME, contents=contents)
        return response.text.strip()
    except Exception as e:
        try:
            simple_contents = [{"role": "user", "parts": [{"text": system_prompt + "\n\nUser: " + message}]}]
            response = await client.aio.models.generate_content(model=MODEL_NAME, contents=simple_contents)
            return response.text.strip()
        except:
            return "I'm having a bit of trouble connecting to my knowledge base. Let's try that again!"

async def generate_study_material(topic: str, subtopic: str, duration: int, proficiency: str = "Intermediate") -> str:
    prompt = f"""
    Generate structured study content in a clean, readable format similar to ChatGPT or Gemini responses.
    
    Topic Context: "{topic}" (Subject)
    Focus Area: "{subtopic}" (User's specific weak topic)
    Reading Time: {duration} minutes
    User Proficiency Level: {proficiency}

    Structure the response STRICTLY as:
    Title
    Introduction (2-3 lines)
    Core Concepts (explained in sections with headings)
    Examples (simple and practical)
    Key Takeaways (bullet-style but without symbols)
    Optional Practice Question (1-2 questions)

    RULES:
    - Do not use special symbols like *, #, or markdown formatting for normal text.
    - Use clear headings and proper spacing.
    - Keep explanations concise and structured.
    - Adapt to user level ({proficiency}) and reading time ({duration} minutes).
    - Focus heavily on the weak topic: {subtopic}.

    SPECIAL HANDLING:
    - For code questions/concepts:
      - Display code in a properly formatted code block (using triple backticks is allowed only for actual code blocks).
      - Include explanation below the code.
      - Keep code simple and readable.

    - For math questions/concepts:
      - Show formulas clearly on separate lines.
      - Break down steps step-by-step.
      - Keep calculations easy to follow.

    TONE:
    - Educational, clear, and structured.
    - Beginner-friendly where needed, detailed for advanced users.
    """
    try:
        response = await client.aio.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.strip()
        # Clean up any full-body markdown wrapping
        if text.startswith("```") and text.split("\n")[0].isalpha(): 
            text = "\n".join(text.split("\n")[1:-1]).strip()
        return text
    except Exception as e:
        print(f"AI STUDY GEN ERROR: {e}")
        return "Apologies, the Generation Engine is currently resting. Please try again."

async def generate_explore_material(topic: str, duration: int, proficiency: str = "Intermediate") -> str:
    prompt = f"""
    Generate structured study content in a clean, readable format similar to ChatGPT or Gemini responses.
    
    Topic: "{topic}"
    Reading Time: {duration} minutes
    User Proficiency Level: {proficiency}

    This is a NEW TOPIC for the user — they want to explore and learn it from scratch.

    Structure the response STRICTLY as:
    Title
    Introduction (2-3 lines explaining what this topic is and why it matters)
    Core Concepts (explained in sections with headings, covering the fundamentals)
    Examples (simple and practical, real-world applications)
    Key Takeaways (bullet-style but without symbols)
    Optional Practice Question (1-2 questions to self-test)

    RULES:
    - Do not use special symbols like *, #, or markdown formatting for normal text.
    - Use clear headings and proper spacing.
    - Keep explanations concise and structured.
    - Adapt to user level ({proficiency}) and reading time ({duration} minutes).
    - Since this is exploratory learning, cover the topic broadly and build foundational understanding.

    SPECIAL HANDLING:
    - For code questions/concepts:
      - Display code in a properly formatted code block (using triple backticks is allowed only for actual code blocks).
      - Include explanation below the code.
      - Keep code simple and readable.

    - For math questions/concepts:
      - Show formulas clearly on separate lines.
      - Break down steps step-by-step.
      - Keep calculations easy to follow.

    TONE:
    - Educational, clear, and structured.
    - Beginner-friendly where needed, detailed for advanced users.
    """
    try:
        response = await client.aio.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.strip()
        if text.startswith("```") and text.split("\n")[0].isalpha(): 
            text = "\n".join(text.split("\n")[1:-1]).strip()
        return text
    except Exception as e:
        print(f"AI EXPLORE GEN ERROR: {e}")
        return "Apologies, the Generation Engine is currently resting. Please try again."
