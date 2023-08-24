const { OpenAI } = require("langchain/llms/openai");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { ConversationalRetrievalQAChain } = require("langchain/chains");
const PineconeClient = require("@pinecone-database/pinecone").PineconeClient;
const OpenAIEmbeddings =
  require("langchain/embeddings/openai").OpenAIEmbeddings;

const dotenv = require("dotenv");
dotenv.config();

async function apiCompare(req, res) {
  const { question, history } = req.body;

  console.log("question", question);

  if (!question) {
    return res.status(400).json({ message: "No question in the request" });
  }

  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll("\n", " ");

  try {
    const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

    Chat History:
    {chat_history}
    Follow Up Input: {question}
    Standalone question:`;

    const QA_PROMPT_API = `You are a powerful AI openapi code inspector. Use the following context about an api specification and create a json object of 5 apis that match the specific API specification, providing a matching score for the specification. 
    Only give the json object as the response, don't use single word rather than the json object. Each object in the array must contain the following keys: name, url, operationId and matchingScore.
    If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
    If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

    {context}

    Question: {question}
    Helpful answer in markdown:`;

    let response;

    // async function main() {
    const client = new PineconeClient();
    async function initializeClient() {
      await client.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
      });
    }
    await initializeClient();

    // init vectorstore
    const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);
    // rest of your code
    let vectorStore;
    async function initvectorStore() {
      vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        {
          pineconeIndex,
          textKey: "text",
          namespace: "pdf-test",
        }
      );
      // return vectorStore;
    }
    await initvectorStore();
    // init chain
    async function makeChain(vectorStore) {
      const model = new OpenAI({
        temperature: 0, // increase temepreature to get more creative answers
        modelName: "gpt-4", //change this to gpt-4 if you have access
        // modelName: 'gpt-3.5-turbo', //change this to gpt-4 if you have access
      });

      const chain = ConversationalRetrievalQAChain.fromLLM(
        model,
        vectorStore.asRetriever(),
        {
          qaTemplate: QA_PROMPT_API,
          questionGeneratorTemplate: CONDENSE_PROMPT,
          returnSourceDocuments: true, //The number of source documents returned is 4 by default
        }
      );
      const RES = await chain.call({
        question: sanitizedQuestion,
        chat_history: history || [],
      });
      response = RES;
    }
    await makeChain(vectorStore);

    // main();
    console.log("response: \n", response);
    console.log("question:- ", question);
    res.status(200).json(response);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
}

module.exports = {
  apiCompare,
};
