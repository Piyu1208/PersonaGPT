import OpenAI from "openai";
import { NextResponse } from "next/server";
import creators, { type CreatorKey, summaryPrompt } from "./creators";

const client = new OpenAI({
  baseURL: "https://aicredits.in/v1",
  apiKey: process.env.OPEN_API_KEY,
});

function isCreatorKey(value: unknown): value is CreatorKey {
  return value === "hitesh" || value === "piyush";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { messages, creator } = body;

    if (!messages || !Array.isArray(messages) || !creator) {
      return NextResponse.json(
        { error: "Messages and creator are required." },
        { status: 400 },
      );
    }

    if (!isCreatorKey(creator)) {
      return NextResponse.json({ error: "Invalid creator." }, { status: 400 });
    }

    const instructions = creators[creator].instructions;

    if (messages.length >= 10) {
      const oldMessages = messages.slice(0, -3);
      const recentMessages = messages.slice(-2);

      //Summarize the older conversation
      const summaryResponse = await client.responses.create({
        model: "gpt-4o-mini",
        instructions: summaryPrompt,
        input: oldMessages,
      });

      const summary = summaryResponse.output_text;

      // Give actual model summary  + recent messages
      const messagesToSend = [
        {
          role: "user",
          content: `Summary of earlier conversation: \n${summary}`,
        },
        ...recentMessages,
      ];

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        instructions,
        input: messagesToSend,
      });

      console.log(messagesToSend);

      return NextResponse.json({
        answer: response.output_text,
      });
    }

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: messages,
    });

    return NextResponse.json({
      answer: response.output_text,
    });

  } catch (error) {
    console.error("Open API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the answer." },
      { status: 500 },
    );
  }
}
