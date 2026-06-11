import streamlit as st
from langchain_community.llms import Ollama
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

# --- UI Configuration ---
st.set_page_config(page_title="AIrport Buddy", page_icon="✈️")
st.title("✈️ AIrport Buddy (Local LLM)")
st.caption("Running 100% locally. No cloud APIs. Fully private.")

# --- 1. The Brains & Persona ---
# This prompt dictates the humor and multilingual support
prompt_template = PromptTemplate.from_template("""
You are a witty, highly helpful, and slightly sarcastic AI Airport Companion.
Your goal is to help passengers navigate, find food, check gate times, and find duty-free offers.

CRITICAL RULES:
1. If the user speaks in Hindi, Tamil, Telugu, or any other Indian language, you MUST reply in that exact same language.
2. Always base your directions and time estimates strictly on the provided context. 
3. If you don't know the answer based on the context, make a lighthearted joke about lost luggage or airport Wi-Fi, but honestly admit you don't know. Do not make up facts.

Context: {context}

Passenger query: {input}

Response:
""")

# --- 2. Load & Embed Data (RAG Setup) ---
@st.cache_resource
def setup_rag():
    # Load the static data we created in Step 3
    loader = TextLoader("airport_directory.txt")
    docs = loader.load()
    
    # Split text into manageable chunks so the LLM doesn't get overwhelmed
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    splits = text_splitter.split_documents(docs)
    
    # Create embeddings using the local nomic model
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings)
    
    # Return a retriever that fetches the top 3 most relevant chunks
    return vectorstore.as_retriever(search_kwargs={"k": 3})

retriever = setup_rag()

# --- 3. Connect the Local LLM ---
# Local on-device LLM. Override via env: AEROASSIST_LLM=gemma4:e2b /
# gemma4:26b / gemma4:31b / gemma3:4b etc. Default to Gemma 4 E4B.
import os as _os
llm = Ollama(model=_os.getenv("AEROASSIST_LLM", "gemma2:9b"))

document_chain = create_stuff_documents_chain(llm, prompt_template)
retrieval_chain = create_retrieval_chain(retriever, document_chain)

# --- 4. The Chat Interface ---
# Initialize chat history in session state
if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "assistant", "content": "Namaste! Where are you flying to today? Ask me for directions, food, or duty-free deals!"}]

# Display previous messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Handle new user input
if prompt := st.chat_input("E.g., How far is Gate B and where can I get Dosa?"):
    # Show user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Generate and show assistant response
    with st.chat_message("assistant"):
        with st.spinner("Checking terminal maps... 🗺️"):
            # Pass the user's question to our RAG chain
            response = retrieval_chain.invoke({"input": prompt})
            answer = response["answer"]
            
            st.markdown(answer)
            st.session_state.messages.append({"role": "assistant", "content": answer})