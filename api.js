const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFuJqCdwdXX8k8VnLXfoyDqGDWfkObo_VENM3jZB7telMGO8R29rqIx5Jvp5WJb3g/exec';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return json(405, { status: 'ERROR', message: 'Method Not Allowed' });
  try {
    const upstream = await fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: event.body || '{}' });
    const text = await upstream.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { status: 'ERROR', message: 'Apps Script trả về dữ liệu không hợp lệ.' }; }
    return json(upstream.ok ? 200 : upstream.status, data);
  } catch (error) {
    return json(502, { status: 'ERROR', message: 'Không thể kết nối Apps Script: ' + (error && error.message ? error.message : String(error)) });
  }
};

function json(statusCode, data) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(data == null ? null : data) };
}
