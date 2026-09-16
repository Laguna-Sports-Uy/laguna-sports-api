const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS
    }
  });
}

function photoUrl(key) {
  return "/foto/" + key.split("/").map(encodeURIComponent).join("/");
}

function cleanName(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(-120);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS
      });
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/foto/")
    ) {
      const key = url.pathname
        .slice("/foto/".length)
        .split("/")
        .map(decodeURIComponent)
        .join("/");

      const archivo = await env.PHOTOS_BUCKET.get(key);

      if (!archivo) {
        return new Response("Foto no encontrada", {
          status: 404,
          headers: CORS
        });
      }

      const headers = new Headers(CORS);
      archivo.writeHttpMetadata(headers);

      if (!headers.get("Content-Type")) {
        headers.set("Content-Type", "image/jpeg");
      }

      headers.set("ETag", archivo.httpEtag);

      return new Response(archivo.body, { headers });
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/fotos")
    ) {
      const carrera =
        url.searchParams.get("carrera") || "genesis-inka-2026";

      const prefix =
        carrera.replace(/[^a-zA-Z0-9_-]/g, "") + "/";

      const lista = await env.PHOTOS_BUCKET.list({ prefix });

      const fotos = lista.objects
        .filter((a) => a.size > 0)
        .map((a) => ({
          nombre: a.key,
          tamano: a.size,
          url: photoUrl(a.key)
        }));

      return json({
        ok: true,
        bucket: "laguna-sports-media",
        carrera,
        cantidad: fotos.length,
        fotos
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/subir"
    ) {
      const contentType =
        request.headers.get("Content-Type") || "";

      if (!contentType.includes("multipart/form-data")) {
        return json({
         
