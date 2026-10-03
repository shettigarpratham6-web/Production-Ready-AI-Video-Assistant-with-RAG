# extractor.py
# Extracts actionable items, key decisions, and unresolved questions
# from meeting transcripts.

import os

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda


def get_llm():
    """Create and return the Ollama LLM."""
    return ChatOllama(
        model="llama3.2:latest",
        temperature=0.2,
        keep_alive="1h",
    )


def build_chain(system_prompt: str):
    """Build a reusable LangChain extraction chain."""

    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{text}"),
    ])

    return (
        RunnablePassthrough()
        | RunnableLambda(lambda x: {"text": x})
        | prompt
        | llm
        | StrOutputParser()
    )


_action_chain = None
_decision_chain = None
_question_chain = None


def extract_action_items(transcript: str) -> str:
    """Extract action items, owners, and deadlines."""
    global _action_chain
    if _action_chain is None:
        _action_chain = build_chain(
            """
            You are an expert meeting analyst.

            Analyze the meeting transcript and extract every actionable task.

            For each action item provide:
            - Task: What needs to be done
            - Owner: Person responsible, if mentioned
            - Deadline: Deadline if mentioned, otherwise "Not specified"

            Rules:
            - Do not invent missing information.
            - Only include tasks explicitly stated or clearly assigned.
            - If the owner is unknown, write "Not specified".
            - If no action items exist, return exactly:
              "No action items found."

            Format the result as a numbered list.
            """
        )

    return _action_chain.invoke(transcript)


def extract_key_decisions(transcript: str) -> str:
    """Extract key decisions made during the meeting."""
    global _decision_chain
    if _decision_chain is None:
        _decision_chain = build_chain(
            """
            You are an expert meeting analyst.

            Analyze the meeting transcript and extract all important decisions
            that were actually agreed upon during the meeting.

            Rules:
            - Do not treat suggestions or possibilities as decisions.
            - Do not invent information.
            - Include the final decision and relevant context when useful.
            - If no decisions were made, return exactly:
              "No key decisions found."

            Format the result as a numbered list.
            """
        )

    return _decision_chain.invoke(transcript)


def extract_questions(transcript: str) -> str:
    """Extract unresolved questions and follow-up topics."""
    global _question_chain
    if _question_chain is None:
        _question_chain = build_chain(
            """
            You are an expert meeting analyst.

            Analyze the meeting transcript and identify:
            - Unresolved questions
            - Topics requiring clarification
            - Issues requiring follow-up

            Rules:
            - Only include genuinely unresolved items.
            - Do not include questions that were already answered.
            - Do not invent questions.
            - If there are no unresolved questions, return exactly:
              "No open questions found."

            Format the result as a numbered list.
            """
        )

    return _question_chain.invoke(transcript)