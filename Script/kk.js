let body = $response.body || "";

try {
  let obj = JSON.parse(body);
  let url = $request.url;

  if (
    url.includes("/v1.0/text2voice/checkCount") ||
    url.includes("/v1.0/text2voice/consumeCount")
  ) {
    if (!obj.data) obj.data = {};
    obj.data.totalCount = 999;
    obj.data.currCount = 999;
  }

  if (url.includes("/v1.0/text2voice/createTtsAudio")) {
    if (!obj.data) obj.data = {};
    obj.data.freeCount = 999;
  }

  $done({ body: JSON.stringify(obj) });
} catch (e) {
  $done({ body });
}