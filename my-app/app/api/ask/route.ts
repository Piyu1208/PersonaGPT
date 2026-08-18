import OpenAI from "openai";
import { NextResponse } from "next/server";
import creators from "./creators";

const client = new OpenAI({
    baseURL: 'https://aicredits.in/v1',
    apiKey: process.env.OPEN_API_KEY
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { question, creator } = body;

        if (!question || !creator) {
            return NextResponse.json(
                { error: "Question and creator are required."},
                { status: 400 }
            );
        }



        const response = await client.responses.create({
            model: "gpt-4o-mini",
            instructions: creator === 'Hitesh' ? creators.hitesh.instructions : creators.piyush.instructions,
            input: question,
        });

        return NextResponse.json({
            answer: response.output_text,
        });
    } catch (error) {
        console.error("Open API error:", error);

        return NextResponse.json(
            { error: "Something went erong while generating the answer." },
            { status: 500 }
        );
    }
}