<script lang="ts">
	import ChatMessage from '$lib/components/ChatMessage.svelte'
	import {ChatCompletionRequestMessage} from "openai";
 	import {SSE} from "sse.js"

	let query: string = "";
	let answer: string = "";
	let loading: boolean = false;
	let chatMessages: ChatCompletionRequestMessage[] = [];
	let scrollToDiv: HTMLDivElement

	function scrollToBottom() {
		setTimeout(function () {
			scrollToDiv.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"})
		}, 100)
	}

	const handleSubmit = async () => {
		loading = true
		chatMessages = [...chatMessages, { role: "user", content: query}]

		const eventSource = new SSE("/api/chat", {
			headers: {
				"Content-Type": "application/json"
			},
			payload: JSON.stringify({messages: chatMessages})
		})

		query = "";

		eventSource.addEventListener("error", handleError)

		eventSource.addEventListener("message", (e) => {
			scrollToBottom()
			try {
				loading = false
				if (e.data === "[DONE]") {
					chatMessages = [...chatMessages, {role: "assistant", content: answer}]
					answer = ""
					return
				}
				const completionResponse = JSON.parse(e.data)
				const [{ delta}] = completionResponse.choices

				if (delta.content) {
					answer = (answer ?? "") + delta.content
				}

			} catch (err) {
				handleError(err)
			}
		})
		eventSource.stream()
		scrollToBottom()
	}

	function handleError<T>(err: T) {
		loading = false
		query = ""
		answer = ""
		console.error(err)
	}

</script>

<div class="flex flex-col pt-10 w-10/12 items-center gap-5">
	<div>
		<h1 class="text-3xl font-extrabold text-center"> Awfully <span class="text-transparent bg-clip-text bg-gradient-to-r to-cyan-600 from-sky-200"> Chat</span>-ty </h1>
	</div>
	<form class="flex w-full rounded-md gap-4 bg-gray-900 p-4"
		  on:submit|preventDefault ={() => handleSubmit()}>
		<input type="text" class="input w-full" bind:value={query} />
		<button type="submit" class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 border-b-4 border-blue-700 hover:border-blue-500 rounded">
			Send
		</button>
	</form>
	<div class="h-[400px] w-full bg-gray-900 rounded-md p-4 overflow-y-auto flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<ChatMessage type="assistant" message= "Ask me anything" />
			{#each chatMessages as message}
				<ChatMessage type = {message.role} message = {message.content} />
				{/each}
			{#if answer}
				<ChatMessage type="assistant" message= {answer} />
				{/if}
			{#if loading}
				<ChatMessage type="assistant" message= "Loading..." />
				{/if}
		</div>
		<div class="" bind:this={scrollToDiv}></div>
	</div>

</div>
