import type {RequestHandler} from "./$types";
import {OPENAI_KEY} from "$env/static/private"
import type {ChatCompletionRequestMessage, CreateChatCompletionRequest} from "openai";
import {getTokens} from "../../../lib/tokenizer";
import { json } from "@sveltejs/kit";

export const POST: RequestHandler = async ({request}) => {

    try {
        if (!OPENAI_KEY) {
            throw new Error("OPENAI_KEY env variable not set")
        }
        const requestData = await request.json()
        if (!requestData) {
            throw new Error("No req data")
        }

        const reqMessages: ChatCompletionRequestMessage[] = requestData.messages

        if (!reqMessages) {
            throw new Error("No messages")
        }

        let tokenCount = 0
        reqMessages.forEach((msg) => {
            const tokens = getTokens(msg.content)
            tokenCount += tokens
        })

        const moderationRes = await fetch("https://api.openai.com/v1/moderations", {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_KEY}`
            },
            method: "POST",
            body: JSON.stringify({
                input: reqMessages[reqMessages.length -1].content
            })
        })
        if (!moderationRes.ok) {
            const err = await moderationRes.json()
            throw new Error(err)
        }

        const moderationData = await moderationRes.json()
        const [results] = moderationData.results

        if (results.flagged) {
            throw new Error("Flagged by OpenAI")
        }

        const prompt = "You are a personal coding assistant for a interview project. You are designated as Xi-Nu 73 "
        tokenCount += getTokens(prompt)

        if (tokenCount >= 4000) {
            throw new Error("Exceeds token count")
        }

        const messages: ChatCompletionRequestMessage[] = [
            {role: "system", content: prompt},
            ...reqMessages
        ]

        const chatReqOpts: CreateChatCompletionRequest = {
            model: "gpt-3.5-turbo",
            messages,
            temperature: 0.9,
            stream: true
        }

        const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_KEY}`
            },
            method: "POST",
            body: JSON.stringify(chatReqOpts)
        })

        if (!chatResponse.ok) {
            const err = await chatResponse.json()
            throw new Error(err)
        }

        return new Response(chatResponse.body, {
            headers: {
                "Content-Type": "text/event-stream"
            }
        })
    } catch (err) {
        console.error(err)
        return json(
            {error: "There was an error while processing your request"},
            {status: 500})
    }
    return new Response();
}