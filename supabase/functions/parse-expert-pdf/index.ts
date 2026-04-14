import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdf_base64 } = await req.json()
    if (!pdf_base64) {
      return new Response(JSON.stringify({ error: 'pdf_base64 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `이 PDF는 전문가 등록 신청서입니다. 아래 항목을 JSON으로 추출해줘.
반드시 JSON만 출력하고 다른 텍스트는 없어야 해:
{
  "name": "성명",
  "birth_date": "생년월일",
  "phone": "연락처",
  "email": "메일주소",
  "affiliation": "소속",
  "position": "직위",
  "bank_account": "계좌번호",
  "education": "최종학력",
  "major": "전공",
  "address": "주소",
  "specialty": "전문분야",
  "tech_fields": ["기술분야 배열"],
  "licenses": [{"name":"자격증명","date":"발급일자","org":"발급기관"}],
  "work_history": [{"org":"소속","period":"기간","dept":"부서","role":"직위","task":"담당업무"}],
  "consulting_history": [{"org":"기관","period":"기간","project":"사업명","content":"내용"}]
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdf_base64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Claude API error ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''

    // Extract JSON from response (strip any surrounding markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response')
    }
    const result = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
