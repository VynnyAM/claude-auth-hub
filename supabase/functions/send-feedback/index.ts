import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  message: string;
  email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, email }: FeedbackRequest = await req.json();

    console.log("Feedback received:", { hasEmail: !!email, messageLength: message?.length });

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagem não pode estar vazia" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const isAnonymous = !email || email.trim().length === 0;
    const senderInfo = isAnonymous ? "Anônimo" : email;

    const emailResponse = await resend.emails.send({
      from: "Genograma Familiar <onboarding@resend.dev>",
      to: ["vrollsing@gmail.com"],
      subject: "Novo Feedback do Sistema - Genograma Familiar",
      html: `
        <h1>Novo Feedback Recebido</h1>
        <p><strong>De:</strong> ${senderInfo}</p>
        <p><strong>Tipo:</strong> ${isAnonymous ? "Feedback Anônimo" : "Feedback Identificado"}</p>
        <hr />
        <h2>Mensagem:</h2>
        <p style="white-space: pre-wrap;">${message}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          Este feedback foi enviado através do sistema de Genograma Familiar.
        </p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao enviar feedback" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
