import OpenAI from "openai";
import { NextResponse } from "next/server";
import creators, { type CreatorKey, summaryPrompt } from "./creators";
import Conversation from "../models/Conversation";
import Summary from "../models/Summary";
import dbConnect from "../lib/mongoose";
import { encoding_for_model } from "tiktoken";

const client = new OpenAI({
  baseURL: "https://aicredits.in/v1",
  apiKey: process.env.OPEN_API_KEY,
});

function isCreatorKey(value: unknown): value is CreatorKey {
  return value === "hitesh" || value === "piyush";
}

const encoder = encoding_for_model("gpt-4o-mini");

type OpenAIMessage = {
  role: "user" | "assistant";
  content: string;
};

function toOpenAIMessages(
  messages: { role: "user" | "assistant"; content: unknown }[],
): OpenAIMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content:
      message.role === "assistant"
        ? JSON.stringify(message.content)
        : String(message.content),
  }));
}

function splitMessagesByTokenBudget(
  messages: OpenAIMessage[],
  recentTokenBudget: number,
) {
  const recentMessages: OpenAIMessage[] = [];
  let recentTokens = 0;

  let splitIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = encoder.encode(messages[i].content).length;

    if (recentTokens + messageTokens <= recentTokenBudget) {
      recentMessages.unshift(messages[i]);
      recentTokens += messageTokens;
      splitIndex = i;
    } else {
      break;
    }
  }

  return {
    messagesToSummarize: messages.slice(0, splitIndex),
    recentMessages,
    splitIndex,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { input, creator, conversationId } = body;

    if (!input || !creator) {
      return NextResponse.json(
        { error: "Input and creator are required." },
        { status: 400 },
      );
    }

    if (!isCreatorKey(creator)) {
      return NextResponse.json({ error: "Invalid creator." }, { status: 400 });
    }

    await dbConnect();

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 },
        );
      }

      // Add user's message to existing conversation
      conversation.messages.push({
        role: "user",
        content: input,
      });

      await conversation.save();
    } else {
      // First message -> create new conversation
      conversation = await Conversation.create({
        messages: [
          {
            role: "user",
            content: input,
          },
        ],
      });
    }

    const messages = toOpenAIMessages(conversation.messages);

    const instructions = creators[creator].instructions;

    const RECENT_MESSAGES_BUDGET = 2500;

    const CONTEXT_THRESHOLD = 7000;

    let messagesToSend: OpenAIMessage[];

    //Find existing summary for this conversation.
    let summaryDoc = await Summary.findOne({
      conversation: conversation._id,
    });

    let totalTokenCount = messages.reduce(
      (total, message) => total + encoder.encode(message.content).length,
      summaryDoc ? encoder.encode(summaryDoc.content).length : 0,
    );

    //Case 1: no summary, at 10 messages: sum(1-8), 9, 10

    if (!summaryDoc && totalTokenCount > CONTEXT_THRESHOLD) {
      const { messagesToSummarize, recentMessages } =
        splitMessagesByTokenBudget(messages, RECENT_MESSAGES_BUDGET);

      const summaryResponse = await client.responses.create({
        model: "gpt-4o-mini",
        instructions: summaryPrompt,
        input: messagesToSummarize,
      });

      const summary = summaryResponse.output_text;

      //first summary created

      summaryDoc = await Summary.create({
        conversation: conversation._id,
        content: summary,

        //summary contains messags from index 0
        //up to this index - 1
        summarizedUntil: messagesToSummarize.length,
      });

      messagesToSend = [
        {
          role: "user",
          content: `Summary of earlier conversation:\n${summaryDoc.content}`,
        },
        ...recentMessages,
      ];
    }

    //Case 2: summary already exists
    else if (summaryDoc) {
      const unsummarizedMessages = messages.slice(summaryDoc.summarizedUntil);

      const totalTokenCount =
        encoder.encode(summaryDoc.content).length +
        unsummarizedMessages.reduce(
          (total, message) => total + encoder.encode(message.content).length,
          0,
        );

      if (totalTokenCount > CONTEXT_THRESHOLD) {
        const { messagesToSummarize, recentMessages } =
          splitMessagesByTokenBudget(
            unsummarizedMessages,
            RECENT_MESSAGES_BUDGET,
          );

        //update summary only if there are messages
        //that actually need to be added to it
        if (messagesToSummarize.length > 0) {
          const summaryInput: OpenAIMessage[] = [
            {
              role: "user",
              content: `Existing conversation summary:
            \n${summaryDoc.content}\n\nUpdate this summary using
            the following next messages.
            `,
            },
            ...messagesToSummarize,
          ];

          const summaryResponse = await client.responses.create({
            model: "gpt-4o-mini",
            instructions: summaryPrompt,
            input: summaryInput,
          });

          //Overwrite the previous summary
          summaryDoc.content = summaryResponse.output_text;

          //Move the boundary forward
          summaryDoc.summarizedUntil += messagesToSummarize.length;

          await summaryDoc.save();
        }

        messagesToSend = [
          {
            role: "user",
            content: `Summary of earlier conversation:\n${summaryDoc.content}`,
          },
          ...recentMessages,
        ];
      } else {
        //Context is still small enough
        // Don't summarize anything
        messagesToSend = [
          {
            role: "user",
            content: `Summary of earlier conversation:\n${summaryDoc.content}`,
          },
          ...unsummarizedMessages,
        ];
      }
    }

    //Case 3 context small no summary.
    else {
      messagesToSend = messages;
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: messagesToSend,
    });

    let assistantResponse;

    try {
      assistantResponse = JSON.parse(response.output_text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON." },
        { status: 500 },
      );
    }

    //save response to convsersation

    conversation.messages.push({
      role: "assistant",
      content: assistantResponse,
    });

    await conversation.save();

    return NextResponse.json({
      conversationId: conversation._id,
      creator: assistantResponse.creator,
      answer: assistantResponse.answer,
    });
  } catch (error) {
    console.error("Open API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the answer." },
      { status: 500 },
    );
  }
}
