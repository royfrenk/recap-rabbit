export async function GET() {
  return new Response('google-site-verification: googledcf1c9efdd7ac7ca.html', {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
