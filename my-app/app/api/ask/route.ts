import OpenAI from "openai";
import { NextResponse } from "next/server";
import creators, { type CreatorKey, summaryPrompt } from "./creators";
import Conversation from "../models/Conversation";
import Summary from "../models/Summary";
import dbConnect from "../lib/mongoose";

const client = new OpenAI({
  baseURL: "https://aicredits.in/v1",
  apiKey: process.env.OPEN_API_KEY,
});

function isCreatorKey(value: unknown): value is CreatorKey {
  return value === "hitesh" || value === "piyush";
}

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

    const RECENT_MESSAGES_COUNT = 8;

    let messagesToSend: OpenAIMessage[];

    //Find existing summary for this conversation.
    let summaryDoc = await Summary.findOne({
      conversation: conversation._id,
    });

    //Case 1: no summary, at 10 messages: sum(1-8), 9, 10

    if (!summaryDoc && messages.length >= 30) {
      const messagesToSummarize = messages.slice(0, -RECENT_MESSAGES_COUNT);

      const recentMessages = messages.slice(-RECENT_MESSAGES_COUNT);

      const summaryResponse = await client.responses.create({
        model: "gpt-4o-mini",
        instructions: summaryPrompt,
        input: messagesToSummarize,
      });

      const summary = summaryResponse.output_text;

      //first summary created 1-8

      summaryDoc = await Summary.create({
        conversation: conversation._id,
        content: summary,
        summarizedUntil: messages.length - RECENT_MESSAGES_COUNT,
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
      const summarizedUntil = summaryDoc.summarizedUntil;

      const newMessagesToSummarize = messages.slice(
        summarizedUntil,
        -RECENT_MESSAGES_COUNT,
      );

      //only create new summary if there are new msgs to be summarized
      if (newMessagesToSummarize.length > 28) {
        //give summarizer: old summ + new msgs (9-15), output new sum 1-15

        const summaryInput: OpenAIMessage[] = [
          {
            role: "user",
            content: `Existing conversation summary:
            \n${summaryDoc.content}\n\nUpdate this summary using
            the following new messages.
            `,
          },
          ...newMessagesToSummarize,
        ];

        const summaryResponse = await client.responses.create({
          model: "gpt-4o-mini",
          instructions: summaryPrompt,
          input: summaryInput,
        });

        const newSummary = summaryResponse.output_text;

        //Overwrite the previous summary.

        summaryDoc.content = newSummary;

        summaryDoc.summarizedUntil = messages.length - RECENT_MESSAGES_COUNT;

        await summaryDoc.save();
      }

      const recentMessages = messages.slice(-RECENT_MESSAGES_COUNT);

      //main model gets summary + last 2 msgs

      messagesToSend = [
        {
          role: "user",
          content: `Summary of earlier conversation:\n${summaryDoc.content}`,
        },
        ...recentMessages,
      ];
    }

    //Case 3 less than 10 msgs and no summary.
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
