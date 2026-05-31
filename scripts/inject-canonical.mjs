import { promises as fs } from "node:fs";
import path from "node:path";

const distDir = path.resolve("docs/.vuepress/dist");
const siteOrigin = "https://www.ekkosonya.cn";

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(fullPath) : fullPath;
    })
  );

  return files.flat();
};

const toCanonicalPath = (htmlPath) => {
  const relativePath = path.relative(distDir, htmlPath).replace(/\\/g, "/");

  if (relativePath === "404.html") return "/404.html";
  if (relativePath === "index.html") return "/";
  if (relativePath.endsWith("/index.html")) {
    return `/${relativePath.slice(0, -"index.html".length)}`;
  }

  return `/${relativePath}`;
};

const injectCanonical = async (htmlPath) => {
  const html = await fs.readFile(htmlPath, "utf8");

  if (html.includes('rel="canonical"') || html.includes("rel='canonical'")) return;

  const canonicalHref = `${siteOrigin}${toCanonicalPath(htmlPath)}`;
  const canonicalTag = `  <link rel="canonical" href="${canonicalHref}">
`;

  const updatedHtml = html.replace("</head>", `${canonicalTag}</head>`);

  if (updatedHtml !== html) {
    await fs.writeFile(htmlPath, updatedHtml, "utf8");
  }
};

const main = async () => {
  const files = await walk(distDir);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));

  await Promise.all(htmlFiles.map(injectCanonical));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
