import OpenAI from "openai";
import { NextResponse } from "next/server";
import creators, { type CreatorKey } from "./creators";

const client = new OpenAI({
    baseURL: 'https://aicredits.in/v1',
    apiKey: process.env.OPEN_API_KEY
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
                { error: "Messages and creator are required."},
                { status: 400 }
            );
        }


        if (!isCreatorKey(creator)) {
            return NextResponse.json(
                { error: "Invalid creator."},
                { status: 400 }
            );
        }

        const instructions = creators[creator].instructions;

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
            { status: 500 }
        );
    }
}