// @ts-nocheck

export const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-finflow-cron-secret',
  'Access-Control-Allow-Origin': '*',
}

export function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
    status,
  })
}
