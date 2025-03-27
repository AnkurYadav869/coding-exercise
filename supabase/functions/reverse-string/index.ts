

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";


export function reverseString(str: string): string {
  return str.split("").reverse().join("");
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const text = url.searchParams.get("text");

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing 'text' query parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const reversed = reverseString(text);

    return new Response(
      JSON.stringify({ reversed }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}); 

// Fetch command to call the above api

// async function fetchReverseString() {
//   const response = await fetch('http://localhost:54321/functions/v1/reverse-string?text=ankur', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`,
//       'Content-Type': 'application/json'
//     }
//   })

//   const data = await response.json()
//   console.log(data)
// }


// curl --request POST 'http://localhost:54321/functions/v1/reverse-string?text=ankur' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{ "text":"Functions" }'